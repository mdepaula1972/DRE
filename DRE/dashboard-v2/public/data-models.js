/**
 * Data Models - Modelos de Dados do Sistema
 * 
 * Define estruturas e validações para Contratos e Notas Fiscais
 */

class Contract {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.nome = data.nome || '';
        this.empresa = data.empresa || 'Mar Brasil'; // 'Mar Brasil' | 'Ybox' | 'DZM'
        this.contrato_por_equipamentos = data.contrato_por_equipamentos || false;
        this.impostos = {
            aplica_iss: data.impostos?.aplica_iss || false,
            aliquota_iss: data.impostos?.aliquota_iss || 0,
            aplica_icms: data.impostos?.aplica_icms || false,
            aliquota_icms: data.impostos?.aliquota_icms || 0
        };
        this.created_at = data.created_at || new Date().toISOString();
        this.updated_at = data.updated_at || new Date().toISOString();
    }

    generateId() {
        return `CONTRACT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    validate() {
        const errors = [];

        if (!this.nome || this.nome.trim() === '') {
            errors.push('Nome do contrato é obrigatório');
        }

        if (!['Mar Brasil', 'Ybox', 'DZM'].includes(this.empresa)) {
            errors.push('Empresa inválida');
        }

        if (this.impostos.aplica_iss && (this.impostos.aliquota_iss < 0 || this.impostos.aliquota_iss > 1)) {
            errors.push('Alíquota ISS deve estar entre 0 e 1 (0% a 100%)');
        }

        if (this.impostos.aplica_icms && (this.impostos.aliquota_icms < 0 || this.impostos.aliquota_icms > 1)) {
            errors.push('Alíquota ICMS deve estar entre 0 e 1 (0% a 100%)');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    toJSON() {
        return {
            id: this.id,
            nome: this.nome,
            empresa: this.empresa,
            contrato_por_equipamentos: this.contrato_por_equipamentos,
            impostos: this.impostos,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

class Invoice {
    constructor(data = {}) {
        this.nf_id = data.nf_id || this.generateId();
        this.contract_id = data.contract_id || '';
        this.numero_nf = data.numero_nf || '';
        this.competencia = data.competencia || ''; // 'MM/YYYY'
        this.data_emissao = data.data_emissao || ''; // 'DD/MM/YYYY'
        this.valor_receita_bruta = parseFloat(data.valor_receita_bruta) || 0;
        this.numero_equipamentos = data.numero_equipamentos || null;

        // Retenção
        this.houve_imposto_retido = data.houve_imposto_retido || false;
        this.valor_imposto_retido = parseFloat(data.valor_imposto_retido) || null;

        // Impostos calculados
        this.impostos = data.impostos || {
            pis: 0,
            cofins: 0,
            iss: 0,
            icms: 0,
            trimestral_provisao: 0,
            total: 0
        };

        // Para competências < 2026: impostos manuais
        this.impostos_manuais = data.impostos_manuais || null;

        this.valor_liquido = parseFloat(data.valor_liquido) || 0;

        // Status e recebimento
        this.status = data.status || 'Pendente'; // 'Pendente' | 'Pago'
        this.data_recebimento = data.data_recebimento || null;

        // Comissões
        this.comissoes = data.comissoes || {
            distribuida: false,
            favorecidos: []
        };

        this.created_at = data.created_at || new Date().toISOString();
        this.updated_at = data.updated_at || new Date().toISOString();

        // Calcular trimestre automaticamente
        this.trimestre = this.calculateTrimestre();
    }

    generateId() {
        return `INV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    calculateTrimestre() {
        if (!this.competencia) return '';
        const [mes, ano] = this.competencia.split('/');
        const mesNum = parseInt(mes);

        let trimestre;
        if (mesNum >= 1 && mesNum <= 3) trimestre = 'T1';
        else if (mesNum >= 4 && mesNum <= 6) trimestre = 'T2';
        else if (mesNum >= 7 && mesNum <= 9) trimestre = 'T3';
        else trimestre = 'T4';

        return `${trimestre}/${ano}`;
    }

    getYear() {
        if (!this.competencia) return null;
        const [, ano] = this.competencia.split('/');
        return parseInt(ano);
    }

    /**
     * Verifica se NF requer cálculo automático de impostos trimestrais
     */
    requiresQuarterlyTax() {
        const year = this.getYear();
        return year && year >= 2026;
    }

    validate(contract = null) {
        const errors = [];

        if (!this.numero_nf || this.numero_nf.trim() === '') {
            errors.push('Número da NF é obrigatório');
        }

        if (!this.contract_id) {
            errors.push('Contrato é obrigatório');
        }

        if (!this.competencia || !/^\d{2}\/\d{4}$/.test(this.competencia)) {
            errors.push('Competência inválida (formato: MM/YYYY)');
        }

        if (!this.data_emissao || !/^\d{2}\/\d{2}\/\d{4}$/.test(this.data_emissao)) {
            errors.push('Data de emissão inválida (formato: DD/MM/YYYY)');
        }

        if (this.valor_receita_bruta <= 0) {
            errors.push('Valor da receita deve ser maior que zero');
        }

        // Validar equipamentos
        if (contract && contract.contrato_por_equipamentos) {
            if (!this.numero_equipamentos || this.numero_equipamentos <= 0) {
                errors.push('Número de equipamentos é obrigatório para este contrato');
            }
        }

        // Validar retenção
        if (this.houve_imposto_retido) {
            if (!this.valor_imposto_retido || this.valor_imposto_retido <= 0) {
                errors.push('Valor de imposto retido deve ser maior que zero quando há retenção');
            }

            if (this.valor_imposto_retido > this.valor_receita_bruta) {
                errors.push('Valor retido não pode ser maior que receita bruta');
            }
        }

        // Validar comissões
        if (this.comissoes.distribuida) {
            const totalAliquota = this.comissoes.favorecidos.reduce(
                (sum, f) => sum + parseFloat(f.aliquota || 0), 0
            );

            if (Math.abs(totalAliquota - 100) > 0.01) {
                errors.push('Soma das alíquotas de comissão deve ser 100%');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Atualiza impostos calculados
     */
    updateTaxes(taxes) {
        this.impostos = taxes;
        this.valor_liquido = this.valor_receita_bruta - taxes.total;
        this.updated_at = new Date().toISOString();
    }

    /**
     * Define impostos manualmente (para competências < 2026)
     */
    setManualTaxes(manualTaxes) {
        this.impostos_manuais = manualTaxes;
        this.impostos = {
            pis: 0,
            cofins: 0,
            iss: 0,
            icms: 0,
            trimestral_provisao: 0,
            total: manualTaxes.total || 0
        };
        this.valor_liquido = this.valor_receita_bruta - (manualTaxes.total || 0);
        this.updated_at = new Date().toISOString();
    }

    /**
     * Marca como paga e distribui comissões
     */
    markAsPaid(dataRecebimento, comissoes = null) {
        this.status = 'Pago';
        this.data_recebimento = dataRecebimento;

        if (comissoes && comissoes.length > 0) {
            // Calcular valores das comissões
            const favorecidos = comissoes.map(c => ({
                nome: c.nome,
                aliquota: parseFloat(c.aliquota),
                valor: (this.valor_liquido * parseFloat(c.aliquota)) / 100
            }));

            this.comissoes = {
                distribuida: true,
                favorecidos
            };
        }

        this.updated_at = new Date().toISOString();
    }

    toJSON() {
        return {
            nf_id: this.nf_id,
            contract_id: this.contract_id,
            numero_nf: this.numero_nf,
            competencia: this.competencia,
            trimestre: this.trimestre,
            data_emissao: this.data_emissao,
            valor_receita_bruta: this.valor_receita_bruta,
            numero_equipamentos: this.numero_equipamentos,
            houve_imposto_retido: this.houve_imposto_retido,
            valor_imposto_retido: this.valor_imposto_retido,
            impostos: this.impostos,
            impostos_manuais: this.impostos_manuais,
            valor_liquido: this.valor_liquido,
            status: this.status,
            data_recebimento: this.data_recebimento,
            comissoes: this.comissoes,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    /**
     * Exporta para formato CSV compatível
     */
    toCSVRow() {
        const contract = storageManager.getContract(this.contract_id);
        const contractName = contract ? contract.nome : this.contract_id;
        const empresa = contract ? contract.empresa : '';

        return {
            Contrato: contractName,
            Empresa: empresa,
            Ciclo: this.competencia.replace('/', '-'),
            'Solicitação': '',
            'Emissão': this.data_emissao,
            'Confirmação': '',
            'Previsão': this.data_recebimento || '',
            'Valor Faturado': this.formatCurrency(this.valor_receita_bruta),
            'Valor líquido': this.formatCurrency(this.valor_liquido),
            'Impostos': this.formatCurrency(this.impostos.total),
            'Status': this.status
        };
    }

    formatCurrency(value) {
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
    }
}

// Exportar classes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Contract, Invoice };
}
