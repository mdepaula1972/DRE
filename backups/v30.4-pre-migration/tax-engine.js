/**
 * Tax Engine - Motor de Cálculo de Impostos Brasileiros
 * 
 * Responsável por calcular impostos mensais (PIS, COFINS, ISS, ICMS)
 * e impostos trimestrais com rateio proporcional (2026+)
 * 
 * Para competências anteriores a 2026: permite entrada manual de impostos
 */

class TaxEngine {
    constructor() {
        this.quarterlyConfigs = this.loadQuarterlyConfigs();
    }

    /**
     * Calcula impostos mensais para um contrato
     * @param {Object} contract - Dados do contrato
     * @param {number} receita - Receita bruta do período
     * @returns {Object} Impostos calculados
     */
    calculateMonthlyTaxes(contract, receita) {
        const pis = receita * 0.0065;  // 0.65%
        const cofins = receita * 0.03;  // 3%
        
        const iss = contract.impostos?.aplica_iss 
            ? receita * (contract.impostos.aliquota_iss || 0)
            : 0;
        
        const icms = contract.impostos?.aplica_icms
            ? receita * (contract.impostos.aliquota_icms || 0)
            : 0;

        return {
            pis: this.round(pis),
            cofins: this.round(cofins),
            iss: this.round(iss),
            icms: this.round(icms),
            total_mensal: this.round(pis + cofins + iss + icms)
        };
    }

    /**
     * Calcula provisão mensal do imposto trimestral
     * Apenas para competências 2026+
     * 
     * @param {string} competencia - MM/YYYY
     * @param {string} contractId - ID do contrato
     * @param {number} receitaMensal - Receita do contrato no mês
     * @param {Array} allInvoices - Todas as NFs do trimestre
     * @returns {number} Provisão do trimestral no mês
     */
    calculateMonthlyQuarterlyProvision(competencia, contractId, receitaMensal, allInvoices) {
        const year = this.getYearFromCompetencia(competencia);
        
        // Regra: imposto trimestral apenas para 2026+
        if (year < 2026) {
            return 0;
        }

        const trimestre = this.getTrimestreFromCompetencia(competencia);
        const config = this.quarterlyConfigs[trimestre];

        if (!config || !config.imposto_total_bruto) {
            return 0; // Trimestre não configurado
        }

        // Calcular receita total do trimestre
        const receitaTrimestre = this.calculateQuarterRevenue(trimestre, allInvoices);
        
        if (receitaTrimestre === 0) {
            return 0;
        }

        // Calcular retenções do trimestre
        const retencoesTrimestre = this.calculateQuarterRetentions(trimestre, allInvoices);
        
        // Imposto líquido do trimestre
        const impostoLiquido = Math.max(config.imposto_total_bruto - retencoesTrimestre, 0);
        
        // Provisão proporcional do mês
        const provisao = impostoLiquido * (receitaMensal / receitaTrimestre);
        
        return this.round(provisao);
    }

    /**
     * Calcula total de impostos para uma NF
     * @param {Object} invoice - Dados da NF
     * @param {Object} contract - Dados do contrato
     * @param {Array} allInvoices - Todas as NFs (para cálculo trimestral)
     * @returns {Object} Breakdown completo de impostos
     */
    calculateInvoiceTaxes(invoice, contract, allInvoices) {
        const receita = invoice.valor_receita_bruta;
        
        // Impostos mensais
        const monthly = this.calculateMonthlyTaxes(contract, receita);
        
        // Provisão trimestral
        const trimestralProvisao = this.calculateMonthlyQuarterlyProvision(
            invoice.competencia,
            invoice.contract_id,
            receita,
            allInvoices
        );

        const total = monthly.total_mensal + trimestralProvisao;

        return {
            pis: monthly.pis,
            cofins: monthly.cofins,
            iss: monthly.iss,
            icms: monthly.icms,
            trimestral_provisao: trimestralProvisao,
            total: this.round(total)
        };
    }

    /**
     * Recalcula impostos de todo um trimestre
     * Chamado quando: NF adicionada/editada/removida, retenção alterada, config trimestral alterada
     * 
     * @param {string} trimestre - 'T1/2026', 'T2/2026', etc
     * @param {Array} allInvoices - Todas as NFs
     * @param {Object} contracts - Mapa de contratos {id: contract}
     * @returns {Array} NFs com impostos recalculados
     */
    recalculateQuarter(trimestre, allInvoices, contracts) {
        const year = this.getYearFromTrimestre(trimestre);
        
        // Regra: não recalcular trimestral para anos < 2026
        if (year < 2026) {
            return allInvoices;
        }

        const quarterInvoices = allInvoices.filter(inv => 
            this.getTrimestreFromCompetencia(inv.competencia) === trimestre
        );

        // Recalcular impostos para cada NF do trimestre
        return quarterInvoices.map(invoice => {
            const contract = contracts[invoice.contract_id];
            if (!contract) return invoice;

            const taxes = this.calculateInvoiceTaxes(invoice, contract, allInvoices);
            
            return {
                ...invoice,
                impostos: taxes,
                valor_liquido: this.round(invoice.valor_receita_bruta - taxes.total)
            };
        });
    }

    /**
     * Calcula receita total de um trimestre
     */
    calculateQuarterRevenue(trimestre, allInvoices) {
        return allInvoices
            .filter(inv => this.getTrimestreFromCompetencia(inv.competencia) === trimestre)
            .reduce((sum, inv) => sum + inv.valor_receita_bruta, 0);
    }

    /**
     * Calcula total de retenções de um trimestre
     */
    calculateQuarterRetentions(trimestre, allInvoices) {
        return allInvoices
            .filter(inv => 
                this.getTrimestreFromCompetencia(inv.competencia) === trimestre &&
                inv.houve_imposto_retido === true
            )
            .reduce((sum, inv) => sum + (inv.valor_imposto_retido || 0), 0);
    }

    /**
     * Calcula rateio do imposto trimestral por contrato
     * @param {string} trimestre - 'T1/2026'
     * @param {Array} allInvoices - Todas as NFs
     * @returns {Object} Mapa {contractId: impostoRateado}
     */
    calculateQuarterlyDistribution(trimestre, allInvoices) {
        const year = this.getYearFromTrimestre(trimestre);
        if (year < 2026) {
            return {};
        }

        const config = this.quarterlyConfigs[trimestre];
        if (!config || !config.imposto_total_bruto) {
            return {};
        }

        const quarterInvoices = allInvoices.filter(inv =>
            this.getTrimestreFromCompetencia(inv.competencia) === trimestre
        );

        const receitaTrimestre = quarterInvoices.reduce(
            (sum, inv) => sum + inv.valor_receita_bruta, 0
        );

        if (receitaTrimestre === 0) {
            return {};
        }

        const retencoes = this.calculateQuarterRetentions(trimestre, allInvoices);
        const impostoLiquido = Math.max(config.imposto_total_bruto - retencoes, 0);

        // Agrupar por contrato
        const receitaPorContrato = {};
        quarterInvoices.forEach(inv => {
            if (!receitaPorContrato[inv.contract_id]) {
                receitaPorContrato[inv.contract_id] = 0;
            }
            receitaPorContrato[inv.contract_id] += inv.valor_receita_bruta;
        });

        // Calcular rateio
        const distribuicao = {};
        Object.keys(receitaPorContrato).forEach(contractId => {
            const peso = receitaPorContrato[contractId] / receitaTrimestre;
            distribuicao[contractId] = this.round(impostoLiquido * peso);
        });

        return distribuicao;
    }

    /**
     * Obtém/define configuração de imposto trimestral
     */
    setQuarterlyConfig(trimestre, impostoTotalBruto) {
        this.quarterlyConfigs[trimestre] = {
            imposto_total_bruto: impostoTotalBruto,
            updated_at: new Date().toISOString()
        };
        this.saveQuarterlyConfigs();
    }

    getQuarterlyConfig(trimestre) {
        return this.quarterlyConfigs[trimestre] || null;
    }

    /**
     * Obtém estatísticas de um trimestre
     */
    getQuarterStats(trimestre, allInvoices) {
        const receita = this.calculateQuarterRevenue(trimestre, allInvoices);
        const retencoes = this.calculateQuarterRetentions(trimestre, allInvoices);
        const config = this.quarterlyConfigs[trimestre];
        const impostoLiquido = config 
            ? Math.max(config.imposto_total_bruto - retencoes, 0)
            : 0;

        return {
            trimestre,
            receita_total: this.round(receita),
            imposto_bruto: config?.imposto_total_bruto || 0,
            retencoes_total: this.round(retencoes),
            imposto_liquido: this.round(impostoLiquido),
            num_invoices: allInvoices.filter(inv =>
                this.getTrimestreFromCompetencia(inv.competencia) === trimestre
            ).length
        };
    }

    // ========== Utilidades ==========

    /**
     * Converte competência MM/YYYY para trimestre Tn/YYYY
     */
    getTrimestreFromCompetencia(competencia) {
        const [mes, ano] = competencia.split('/');
        const mesNum = parseInt(mes);
        
        let trimestre;
        if (mesNum >= 1 && mesNum <= 3) trimestre = 'T1';
        else if (mesNum >= 4 && mesNum <= 6) trimestre = 'T2';
        else if (mesNum >= 7 && mesNum <= 9) trimestre = 'T3';
        else trimestre = 'T4';
        
        return `${trimestre}/${ano}`;
    }

    /**
     * Extrai ano de competência MM/YYYY
     */
    getYearFromCompetencia(competencia) {
        const [, ano] = competencia.split('/');
        return parseInt(ano);
    }

    /**
     * Extrai ano de trimestre Tn/YYYY
     */
    getYearFromTrimestre(trimestre) {
        const [, ano] = trimestre.split('/');
        return parseInt(ano);
    }

    /**
     * Arredonda para 2 casas decimais
     */
    round(value) {
        return Math.round(value * 100) / 100;
    }

    /**
     * Formata valor para BRL
     */
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    // ========== Persistência ==========

    loadQuarterlyConfigs() {
        try {
            const saved = localStorage.getItem('tax_quarterly_configs');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error('Erro ao carregar configs trimestrais:', e);
            return {};
        }
    }

    saveQuarterlyConfigs() {
        try {
            localStorage.setItem('tax_quarterly_configs', JSON.stringify(this.quarterlyConfigs));
        } catch (e) {
            console.error('Erro ao salvar configs trimestrais:', e);
        }
    }

    /**
     * Exporta configurações para backup
     */
    exportConfigs() {
        return JSON.stringify(this.quarterlyConfigs, null, 2);
    }

    /**
     * Importa configurações de backup
     */
    importConfigs(jsonString) {
        try {
            this.quarterlyConfigs = JSON.parse(jsonString);
            this.saveQuarterlyConfigs();
            return true;
        } catch (e) {
            console.error('Erro ao importar configs:', e);
            return false;
        }
    }
}

// Exportar instância global
const taxEngine = new TaxEngine();
