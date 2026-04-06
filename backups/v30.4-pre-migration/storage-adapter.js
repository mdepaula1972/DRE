/**
 * Storage Adapter - Camada de compatibilidade
 * 
 * Adapta o novo supabaseStorage para a interface antiga do storageManager
 * Mantém compatibilidade com o código existente do gestao-integrada.js
 */

const storageManager = {
    // Contratos
    getAllContracts() {
        // Usar método público ao invés de cache privado
        if (!window.supabaseStorage) {
            console.error('[Storage Adapter] supabaseStorage não disponível');
            return [];
        }

        const contratos = window.supabaseStorage.contratos || [];
        return contratos.map(c => ({
            id: c.id,
            nome: c.nome_contrato,
            numero: c.numero_contrato,
            ativo: c.ativo,
            tem_iss: c.tem_iss,
            aliquota_iss: c.aliquota_iss,
            tem_icms: c.tem_icms,
            aliquota_icms: c.aliquota_icms,
            contrato_por_equipamentos: c.contrato_por_equipamentos
        }));
    },

    getContract(contractId) {
        const contracts = this.getAllContracts();
        return contracts.find(c => c.id === contractId);
    },

    // Notas Fiscais
    getAllInvoices() {
        if (!window.supabaseStorage) {
            console.error('[Storage Adapter] supabaseStorage não disponível');
            return [];
        }

        const notas = window.supabaseStorage.notas || [];
        return notas.map(nf => this._adaptInvoice(nf));
    },

    filterInvoices(filters) {
        let invoices = this.getAllInvoices();

        if (filters.contractId) {
            invoices = invoices.filter(nf => nf.contrato_id === filters.contractId);
        }

        // Múltiplas competências
        if (filters.competencias && filters.competencias.length > 0) {
            invoices = invoices.filter(nf => filters.competencias.includes(nf.competencia));
        }

        if (filters.year) {
            invoices = invoices.filter(nf => {
                const year = new Date(nf.data_emissao).getFullYear();
                return year === parseInt(filters.year);
            });
        }

        if (filters.quarter) {
            invoices = invoices.filter(nf => {
                const month = new Date(nf.data_emissao).getMonth() + 1;
                const q = Math.ceil(month / 3);
                return q === parseInt(filters.quarter);
            });
        }

        if (filters.status) {
            invoices = invoices.filter(nf => nf.status === filters.status);
        }

        if (filters.empresa) {
            invoices = invoices.filter(nf => {
                const contract = this.getContract(nf.contrato_id);
                return contract && contract.empresa === filters.empresa;
            });
        }

        return invoices;
    },

    getInvoice(invoiceId) {
        const invoices = this.getAllInvoices();
        return invoices.find(nf => nf.id === invoiceId);
    },

    async addInvoice(invoiceData) {
        // Converter de formato antigo para novo
        const nfData = {
            contrato_id: invoiceData.contrato_id,
            numero_nf: invoiceData.numero_nf,
            empresa: invoiceData.empresa || 'Mar_BR',
            data_emissao: this._convertDate(invoiceData.data_emissao),
            data_vencimento: this._convertDate(invoiceData.data_vencimento),
            valor_bruto: invoiceData.valor_bruto,
            valor_liquido: invoiceData.valor_liquido,
            status: invoiceData.status || 'pendente',
            observacoes: invoiceData.observacoes || null,

            // Impostos (calcular se não fornecido)
            iss: invoiceData.iss || 0,
            pis: invoiceData.pis || 0,
            cofins: invoiceData.cofins || 0,
            ir: invoiceData.ir || 0,
            csll: invoiceData.csll || 0,
            icms: invoiceData.icms || 0,
            inss: invoiceData.inss || 0,

            // Comissões (se houver)
            comissoes: invoiceData.comissoes || []
        };

        const result = await supabaseStorage.createInvoice(nfData);
        return this._adaptInvoice(result);
    },

    async updateInvoice(invoiceId, invoiceData) {
        // Se for apenas mudança de status/pagamento
        if (invoiceData.status === 'pago' || invoiceData.data_recebimento) {
            await supabaseStorage.updateInvoice(invoiceId, {
                status: invoiceData.status || 'pago',
                data_recebimento: invoiceData.data_recebimento ? this._convertDate(invoiceData.data_recebimento) : null,
                comissoes: invoiceData.comissoes || []
            });
            return;
        }

        // Atualização completa
        const updates = {
            numero_nf: invoiceData.numero_nf,
            data_emissao: this._convertDate(invoiceData.data_emissao),
            data_vencimento: this._convertDate(invoiceData.data_vencimento),
            valor_bruto: invoiceData.valor_bruto,
            valor_liquido: invoiceData.valor_liquido,
            status: invoiceData.status,
            observacoes: invoiceData.observacoes,

            iss: invoiceData.iss,
            pis: invoiceData.pis,
            cofins: invoiceData.cofins,
            ir: invoiceData.ir,
            csll: invoiceData.csll,
            icms: invoiceData.icms,
            inss: invoiceData.inss,

            comissoes: invoiceData.comissoes || []
        };

        await supabaseStorage.updateInvoice(invoiceId, updates);
    },

    async deleteInvoice(invoiceId) {
        await supabaseStorage.deleteInvoice(invoiceId);
    },

    // Estatísticas
    getStats(filters = {}) {
        const invoices = filters && Object.keys(filters).length > 0
            ? this.filterInvoices(filters)
            : this.getAllInvoices();

        const total_faturado = invoices.reduce((sum, nf) => sum + (nf.valor_receita_bruta || 0), 0);
        const total_impostos = invoices.reduce((sum, nf) => sum + (nf.impostos?.total || 0), 0);
        const total_liquido = invoices.reduce((sum, nf) => sum + (nf.valor_liquido || 0), 0);

        // Calcular total de comissões
        const total_comissoes = invoices.reduce((sum, nf) => {
            const comissoes = nf.comissoes || [];
            const totalNF = comissoes.reduce((s, c) => s + (c.valor || 0), 0);
            return sum + totalNF;
        }, 0);

        return {
            num_total: invoices.length,
            total_faturado,
            total_impostos,
            total_liquido,
            total_comissoes,
            // Compatibilidade com funções antigas
            totalContratos: this.getAllContracts().length,
            totalNotas: invoices.length,
            totalPago: invoices.filter(nf => nf.status === 'Pago').length,
            totalPendente: invoices.filter(nf => nf.status === 'Pendente').length,
            valorTotal: total_faturado,
            valorLiquido: total_liquido
        };
    },

    // Impostos Trimestrais
    async recalculateQuarter(year, quarter) {
        // Buscar notas do trimestre
        const invoices = this.filterInvoices({ year, quarter });

        // Calcular totais
        const totals = {
            iss: invoices.reduce((sum, nf) => sum + (nf.iss || 0), 0),
            pis: invoices.reduce((sum, nf) => sum + (nf.pis || 0), 0),
            cofins: invoices.reduce((sum, nf) => sum + (nf.cofins || 0), 0),
            ir: invoices.reduce((sum, nf) => sum + (nf.ir || 0), 0),
            csll: invoices.reduce((sum, nf) => sum + (nf.csll || 0), 0),
            icms: invoices.reduce((sum, nf) => sum + (nf.icms || 0), 0),
            inss: invoices.reduce((sum, nf) => sum + (nf.inss || 0), 0)
        };

        // Salvar no banco
        await supabaseStorage.saveQuarterlyTaxes(year, quarter, totals);

        return totals;
    },

    // Exportar para CSV
    exportToCSV(invoices) {
        const headers = [
            'NF',
            'Contrato',
            'Emissão',
            'Vencimento',
            'Valor Bruto',
            'ISS',
            'PIS',
            'COFINS',
            'IR',
            'CSLL',
            'ICMS',
            'INSS',
            'Valor Líquido',
            'Status'
        ];

        const rows = invoices.map(nf => {
            const contrato = this.getContract(nf.contrato_id);
            return [
                nf.numero_nf,
                contrato?.nome || 'N/A',
                this._formatDate(nf.data_emissao),
                this._formatDate(nf.data_vencimento),
                nf.valor_bruto.toFixed(2),
                nf.iss.toFixed(2),
                nf.pis.toFixed(2),
                nf.cofins.toFixed(2),
                nf.ir.toFixed(2),
                nf.csll.toFixed(2),
                nf.icms.toFixed(2),
                nf.inss.toFixed(2),
                nf.valor_liquido.toFixed(2),
                nf.status
            ];
        });

        const csv = [headers, ...rows]
            .map(row => row.join(','))
            .join('\n');

        return csv;
    },

    // Helpers privados
    _adaptInvoice(nf) {
        // Calcular total de impostos
        const totalImpostos = (nf.pis || 0) + (nf.cofins || 0) + (nf.iss || 0) +
            (nf.icms || 0) + (nf.ir || 0) + (nf.csll || 0) + (nf.inss || 0);

        return {
            nf_id: nf.id,
            id: nf.id,
            contract_id: nf.contrato_id,
            contrato_id: nf.contrato_id,
            numero_nf: nf.numero_nf,
            competencia: nf.competencia,
            data_emissao: nf.data_emissao,
            data_recebimento: nf.data_recebimento,
            valor_receita_bruta: nf.valor_faturado || nf.valor_bruto || 0,
            valor_liquido: nf.valor_liquido || 0,
            numero_equipamentos: nf.numero_equipamentos,
            status: nf.status || 'Pendente',

            // Objeto impostos estruturado
            impostos: {
                pis: nf.pis || 0,
                cofins: nf.cofins || 0,
                iss: nf.iss || 0,
                icms: nf.icms || 0,
                ir: nf.ir || 0,
                csll: nf.csll || 0,
                inss: nf.inss || 0,
                total: nf.total_impostos || totalImpostos
            },

            houve_imposto_retido: nf.houve_retencao || false,
            valor_imposto_retido: nf.valor_retido || 0,
            comissoes: nf.comissoes || [],
            created_at: nf.created_at,
            updated_at: nf.updated_at
        };
    },

    _formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    },

    _convertDate(dateStr) {
        if (!dateStr) return null;

        // Se já for ISO (YYYY-MM-DD)
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
            return dateStr.split('T')[0];
        }

        // Se for BR (DD/MM/YYYY)
        if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        return dateStr;
    }
};

// Exportar globalmente
window.storageManager = storageManager;

console.log('[Storage Adapter] Adapter inicializado e disponível globalmente');
