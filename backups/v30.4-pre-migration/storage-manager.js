/**
 * Storage Manager - Gerenciador de Persistência de Dados
 * 
 * Responsável por salvar/carregar dados em localStorage
 * e sincronizar com arquivos CSV existentes
 */

class StorageManager {
    constructor() {
        this.contracts = new Map();
        this.invoices = new Map();
        this.loadData();
    }

    // ========== Contratos ==========

    addContract(contractData) {
        const contract = new Contract(contractData);
        const validation = contract.validate();

        if (!validation.valid) {
            throw new Error(`Validação falhou: ${validation.errors.join(', ')}`);
        }

        this.contracts.set(contract.id, contract);
        this.saveData();
        return contract;
    }

    updateContract(contractId, updates) {
        const contract = this.contracts.get(contractId);
        if (!contract) {
            throw new Error('Contrato não encontrado');
        }

        Object.assign(contract, updates);
        contract.updated_at = new Date().toISOString();

        const validation = contract.validate();
        if (!validation.valid) {
            throw new Error(`Validação falhou: ${validation.errors.join(', ')}`);
        }

        this.contracts.set(contractId, contract);
        this.saveData();
        return contract;
    }

    deleteContract(contractId) {
        // Verificar se há NFs usando este contrato
        const hasInvoices = Array.from(this.invoices.values())
            .some(inv => inv.contract_id === contractId);

        if (hasInvoices) {
            throw new Error('Não é possível excluir contrato com notas fiscais vinculadas');
        }

        const deleted = this.contracts.delete(contractId);
        if (deleted) {
            this.saveData();
        }
        return deleted;
    }

    getContract(contractId) {
        return this.contracts.get(contractId);
    }

    getAllContracts() {
        return Array.from(this.contracts.values());
    }

    // ========== Notas Fiscais ==========

    addInvoice(invoiceData) {
        const invoice = new Invoice(invoiceData);
        const contract = this.getContract(invoice.contract_id);

        const validation = invoice.validate(contract);
        if (!validation.valid) {
            throw new Error(`Validação falhou: ${validation.errors.join(', ')}`);
        }

        // Calcular impostos automaticamente
        if (invoice.requiresQuarterlyTax()) {
            const allInvoices = this.getAllInvoices();
            const taxes = taxEngine.calculateInvoiceTaxes(invoice, contract, allInvoices);
            invoice.updateTaxes(taxes);
        }

        this.invoices.set(invoice.nf_id, invoice);
        this.saveData();

        // Recalcular trimestre se necessário
        if (invoice.requiresQuarterlyTax()) {
            this.recalculateQuarter(invoice.trimestre);
        }

        return invoice;
    }

    updateInvoice(invoiceId, updates) {
        const invoice = this.invoices.get(invoiceId);
        if (!invoice) {
            throw new Error('Nota fiscal não encontrada');
        }

        const oldTrimestre = invoice.trimestre;
        const oldRequiresQuarterly = invoice.requiresQuarterlyTax();

        Object.assign(invoice, updates);
        invoice.trimestre = invoice.calculateTrimestre();
        invoice.updated_at = new Date().toISOString();

        const contract = this.getContract(invoice.contract_id);
        const validation = invoice.validate(contract);

        if (!validation.valid) {
            throw new Error(`Validação falhou: ${validation.errors.join(', ')}`);
        }

        // Recalcular impostos
        if (invoice.requiresQuarterlyTax()) {
            const allInvoices = this.getAllInvoices();
            const taxes = taxEngine.calculateInvoiceTaxes(invoice, contract, allInvoices);
            invoice.updateTaxes(taxes);
        }

        this.invoices.set(invoiceId, invoice);
        this.saveData();

        // Recalcular trimestres afetados
        if (oldRequiresQuarterly || invoice.requiresQuarterlyTax()) {
            this.recalculateQuarter(oldTrimestre);
            if (invoice.trimestre !== oldTrimestre) {
                this.recalculateQuarter(invoice.trimestre);
            }
        }

        return invoice;
    }

    deleteInvoice(invoiceId) {
        const invoice = this.invoices.get(invoiceId);
        if (!invoice) {
            return false;
        }

        const trimestre = invoice.trimestre;
        const requiresRecalc = invoice.requiresQuarterlyTax();

        const deleted = this.invoices.delete(invoiceId);
        if (deleted) {
            this.saveData();

            // Recalcular trimestre
            if (requiresRecalc) {
                this.recalculateQuarter(trimestre);
            }
        }

        return deleted;
    }

    getInvoice(invoiceId) {
        return this.invoices.get(invoiceId);
    }

    getAllInvoices() {
        return Array.from(this.invoices.values());
    }

    /**
     * Filtra notas fiscais por critérios
     */
    filterInvoices(filters = {}) {
        let result = this.getAllInvoices();

        if (filters.competencia) {
            result = result.filter(inv => inv.competencia === filters.competencia);
        }

        if (filters.trimestre) {
            result = result.filter(inv => inv.trimestre === filters.trimestre);
        }

        if (filters.contract_id) {
            result = result.filter(inv => inv.contract_id === filters.contract_id);
        }

        if (filters.empresa) {
            result = result.filter(inv => {
                const contract = this.getContract(inv.contract_id);
                return contract && contract.empresa === filters.empresa;
            });
        }

        if (filters.status) {
            result = result.filter(inv => inv.status === filters.status);
        }

        return result;
    }

    // ========== Recálculo de Trimestre ==========

    recalculateQuarter(trimestre) {
        const allInvoices = this.getAllInvoices();
        const contracts = {};
        this.contracts.forEach((contract, id) => {
            contracts[id] = contract;
        });

        const recalculated = taxEngine.recalculateQuarter(trimestre, allInvoices, contracts);

        // Atualizar NFs recalculadas
        recalculated.forEach(inv => {
            this.invoices.set(inv.nf_id, new Invoice(inv));
        });

        this.saveData();
    }

    // ========== Persistência ==========

    saveData() {
        try {
            const data = {
                contracts: Array.from(this.contracts.values()).map(c => c.toJSON()),
                invoices: Array.from(this.invoices.values()).map(i => i.toJSON()),
                version: '1.0',
                last_updated: new Date().toISOString()
            };

            localStorage.setItem('gestao_integrada_data', JSON.stringify(data));

            // Backup em arquivo JSON (para download manual)
            this.lastBackup = JSON.stringify(data, null, 2);

            return true;
        } catch (e) {
            console.error('Erro ao salvar dados:', e);
            return false;
        }
    }

    loadData() {
        try {
            const saved = localStorage.getItem('gestao_integrada_data');
            if (!saved) return;

            const data = JSON.parse(saved);

            // Carregar contratos
            this.contracts.clear();
            if (data.contracts) {
                data.contracts.forEach(c => {
                    this.contracts.set(c.id, new Contract(c));
                });
            }

            // Carregar NFs
            this.invoices.clear();
            if (data.invoices) {
                data.invoices.forEach(i => {
                    this.invoices.set(i.nf_id, new Invoice(i));
                });
            }

            console.log(`Dados carregados: ${this.contracts.size} contratos, ${this.invoices.size} NFs`);
        } catch (e) {
            console.error('Erro ao carregar dados:', e);
        }
    }

    /**
     * Exporta backup para download
     */
    exportBackup() {
        return this.lastBackup || JSON.stringify({
            contracts: [],
            invoices: [],
            version: '1.0'
        });
    }

    /**
     * Importa dados de backup
     */
    importBackup(jsonString) {
        try {
            const data = JSON.parse(jsonString);

            // Validar estrutura
            if (!data.contracts || !data.invoices) {
                throw new Error('Formato de backup inválido');
            }

            // Limpar dados atuais
            this.contracts.clear();
            this.invoices.clear();

            // Importar
            data.contracts.forEach(c => {
                this.contracts.set(c.id, new Contract(c));
            });

            data.invoices.forEach(i => {
                this.invoices.set(i.nf_id, new Invoice(i));
            });

            this.saveData();
            return true;
        } catch (e) {
            console.error('Erro ao importar backup:', e);
            return false;
        }
    }

    /**
     * Exporta dados para CSV (compatível com sistema antigo)
     */
    exportToCSV() {
        const invoices = this.getAllInvoices();
        const rows = invoices.map(inv => inv.toCSVRow());

        // Converter para CSV
        if (rows.length === 0) return '';

        const headers = Object.keys(rows[0]);
        const csvContent = [
            headers.join(';'),
            ...rows.map(row => headers.map(h => row[h]).join(';'))
        ].join('\n');

        return csvContent;
    }

    // ========== Estatísticas ==========

    getStats(filters = {}) {
        const invoices = this.filterInvoices(filters);

        const totalFaturado = invoices.reduce((sum, inv) => sum + inv.valor_receita_bruta, 0);
        const totalImpostos = invoices.reduce((sum, inv) => sum + inv.impostos.total, 0);
        const totalLiquido = invoices.reduce((sum, inv) => sum + inv.valor_liquido, 0);

        const comissoes = invoices
            .filter(inv => inv.comissoes.distribuida)
            .reduce((sum, inv) => {
                return sum + inv.comissoes.favorecidos.reduce((s, f) => s + f.valor, 0);
            }, 0);

        const pendentes = invoices.filter(inv => inv.status === 'Pendente').length;
        const pagos = invoices.filter(inv => inv.status === 'Pago').length;

        return {
            total_faturado: totalFaturado,
            total_impostos: totalImpostos,
            total_liquido: totalLiquido,
            total_comissoes: comissoes,
            num_pendentes: pendentes,
            num_pagos: pagos,
            num_total: invoices.length
        };
    }
}

// Criar instância global
const storageManager = new StorageManager();
