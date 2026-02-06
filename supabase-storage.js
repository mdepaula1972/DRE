/**
 * Supabase Storage Service
 * 
 * Substitui o storage-manager.js e integra com a API backend
 * Gerencia operações CRUD de contratos, notas fiscais e impostos trimestrais
 */

const SUPABASE_URL = "https://ngtjhwswbbivqajtpjvg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28";

// Cliente Supabase
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

class SupabaseStorageService {
    constructor() {
        this.contracts = new Map();
        this.invoices = new Map();
        this.quarterlyTaxes = new Map();
        this.apiBaseUrl = '/api/gestao-integrada';
    }

    // ==================== INICIALIZAÇÃO ====================

    async initialize() {
        try {
            console.log('[Supabase] Inicializando storage service...');

            // Carregar contratos
            await this.loadContracts();

            // Carregar notas fiscais
            await this.loadInvoices();

            // Carregar impostos trimestrais
            await this.loadQuarterlyTaxes();

            console.log('[Supabase] Inicialização completa:', {
                contratos: this.contracts.size,
                notas: this.invoices.size,
                trimestrais: this.quarterlyTaxes.size
            });

            return true;
        } catch (error) {
            console.error('[Supabase] Erro na inicialização:', error);
            throw error;
        }
    }

    // Getters públicos para compatibilidade
    get contratos() {
        return Array.from(this.contracts.values());
    }

    get notas() {
        return Array.from(this.invoices.values());
    }

    get impostos_trimestrais() {
        return Array.from(this.quarterlyTaxes.values());
    }

    // ==================== CONTRATOS ====================

    async loadContracts() {
        try {
            const { data, error } = await supabaseClient
                .from('contratos_base')
                .select('*')
                .eq('ativo', true)
                .order('nome_contrato');

            if (error) throw error;

            this.contracts.clear();
            (data || []).forEach(c => {
                this.contracts.set(c.id, c);
            });

            return data || [];
        } catch (error) {
            console.error('[Supabase] Erro ao carregar contratos:', error);
            throw error;
        }
    }

    getAllContracts() {
        return Array.from(this.contracts.values());
    }

    getContractById(id) {
        return this.contracts.get(id);
    }

    getContractByName(nome) {
        return this.getAllContracts().find(c => c.nome_contrato === nome);
    }

    // ==================== NOTAS FISCAIS ====================

    async loadInvoices() {
        try {
            const { data, error } = await supabaseClient
                .from('notas_fiscais')
                .select(`
                    *,
                    contratos_base (
                        id,
                        nome_contrato,
                        tem_iss,
                        aliquota_iss,
                        tem_icms,
                        aliquota_icms,
                        contrato_por_equipamentos
                    )
                `)
                .order('data_emissao', { ascending: false });

            if (error) throw error;

            this.invoices.clear();
            (data || []).forEach(nf => {
                this.invoices.set(nf.id, nf);
            });

            return data || [];
        } catch (error) {
            console.error('[Supabase] Erro ao carregar notas fiscais:', error);
            throw error;
        }
    }

    async createInvoice(invoiceData) {
        try {
            const { data, error } = await supabaseClient
                .from('notas_fiscais')
                .insert([invoiceData])
                .select(`
                    *,
                    contratos_base (
                        id,
                        nome_contrato,
                        tem_iss,
                        aliquota_iss,
                        tem_icms,
                        aliquota_icms,
                        contrato_por_equipamentos
                    )
                `)
                .single();

            if (error) throw error;

            this.invoices.set(data.id, data);
            console.log('[Supabase] Nota fiscal criada:', data.numero_nf);
            return data;
        } catch (error) {
            console.error('[Supabase] Erro ao criar nota fiscal:', error);
            throw error;
        }
    }

    async updateInvoice(id, invoiceData) {
        try {
            const { data, error } = await supabaseClient
                .from('notas_fiscais')
                .update(invoiceData)
                .eq('id', id)
                .select(`
                    *,
                    contratos_base (
                        id,
                        nome_contrato,
                        tem_iss,
                        aliquota_iss,
                        tem_icms,
                        aliquota_icms,
                        contrato_por_equipamentos
                    )
                `)
                .single();

            if (error) throw error;

            this.invoices.set(data.id, data);
            console.log('[Supabase] Nota fiscal atualizada:', data.numero_nf);
            return data;
        } catch (error) {
            console.error('[Supabase] Erro ao atualizar nota fiscal:', error);
            throw error;
        }
    }

    async deleteInvoice(id) {
        try {
            const { error } = await supabaseClient
                .from('notas_fiscais')
                .delete()
                .eq('id', id);

            if (error) throw error;

            this.invoices.delete(id);
            console.log('[Supabase] Nota fiscal excluída');
            return true;
        } catch (error) {
            console.error('[Supabase] Erro ao excluir nota fiscal:', error);
            throw error;
        }
    }

    async markInvoiceAsPaid(id, dataRecebimento, comissoes = []) {
        try {
            const updateData = {
                status: 'Pago',
                data_recebimento: dataRecebimento,
                comissoes: comissoes
            };

            const { data, error } = await supabaseClient
                .from('notas_fiscais')
                .update(updateData)
                .eq('id', id)
                .select(`
                    *,
                    contratos_base (
                        id,
                        nome_contrato,
                        tem_iss,
                        aliquota_iss,
                        tem_icms,
                        aliquota_icms,
                        contrato_por_equipamentos
                    )
                `)
                .single();

            if (error) throw error;

            this.invoices.set(data.id, data);
            console.log('[Supabase] Nota fiscal marcada como paga');
            return data;
        } catch (error) {
            console.error('[Supabase] Erro ao marcar nota como paga:', error);
            throw error;
        }
    }

    getAllInvoices() {
        return Array.from(this.invoices.values());
    }

    getInvoiceById(id) {
        return this.invoices.get(id);
    }

    getInvoicesByCompetencia(competencia) {
        return this.getAllInvoices().filter(nf => nf.competencia === competencia);
    }

    getInvoicesByTrimestre(ano, trimestre) {
        const competencias = this.getCompetenciasByQuarter(ano, trimestre);
        return this.getAllInvoices().filter(nf => competencias.includes(nf.competencia));
    }

    getInvoicesByContrato(contratoId) {
        return this.getAllInvoices().filter(nf => nf.contrato_id === contratoId);
    }

    getInvoicesByStatus(status) {
        return this.getAllInvoices().filter(nf => nf.status === status);
    }

    // ==================== IMPOSTOS TRIMESTRAIS ====================

    async loadQuarterlyTaxes() {
        try {
            const { data, error } = await supabaseClient
                .from('impostos_trimestrais')
                .select('*')
                .order('ano', { ascending: false })
                .order('trimestre', { ascending: true });

            if (error) throw error;

            this.quarterlyTaxes.clear();
            (data || []).forEach(qt => {
                const key = `${qt.ano}-Q${qt.trimestre}`;
                this.quarterlyTaxes.set(key, qt);
            });

            return data || [];
        } catch (error) {
            console.error('[Supabase] Erro ao carregar impostos trimestrais:', error);
            throw error;
        }
    }

    async saveQuarterlyTaxes(configs) {
        try {
            const { data, error } = await supabaseClient
                .from('impostos_trimestrais')
                .upsert(configs, { onConflict: 'ano,trimestre' })
                .select();

            if (error) throw error;

            (data || []).forEach(qt => {
                const key = `${qt.ano}-Q${qt.trimestre}`;
                this.quarterlyTaxes.set(key, qt);
            });

            console.log('[Supabase] Impostos trimestrais salvos');
            return data || [];
        } catch (error) {
            console.error('[Supabase] Erro ao salvar impostos trimestrais:', error);
            throw error;
        }
    }

    getQuarterlyTax(ano, trimestre) {
        const key = `${ano}-Q${trimestre}`;
        return this.quarterlyTaxes.get(key);
    }

    getAllQuarterlyTaxes() {
        return Array.from(this.quarterlyTaxes.values());
    }

    getQuarterlyTaxesByYear(ano) {
        return this.getAllQuarterlyTaxes().filter(qt => qt.ano === ano);
    }

    // ==================== CÁLCULOS E HELPERS ====================

    calculateQuarterSummary(ano, trimestre) {
        const nfs = this.getInvoicesByTrimestre(ano, trimestre);

        const totalReceita = nfs.reduce((sum, nf) => sum + parseFloat(nf.valor_faturado || 0), 0);
        const totalRetencoes = nfs.reduce((sum, nf) =>
            sum + (nf.houve_retencao ? parseFloat(nf.valor_retido || 0) : 0), 0
        );

        const quarterTax = this.getQuarterlyTax(ano, trimestre);
        const impostoBruto = quarterTax ? parseFloat(quarterTax.imposto_bruto || 0) : 0;
        const impostoLiquido = Math.max(impostoBruto - totalRetencoes, 0);

        return {
            totalReceita,
            totalRetencoes,
            impostoBruto,
            impostoLiquido,
            numeroNFs: nfs.length
        };
    }

    getCompetenciasByQuarter(ano, trimestre) {
        const startMonth = (trimestre - 1) * 3 + 1;
        const competencias = [];

        for (let i = 0; i < 3; i++) {
            const mes = String(startMonth + i).padStart(2, '0');
            competencias.push(`${ano}-${mes}`);
        }

        return competencias;
    }

    getTrimestreFromCompetencia(competencia) {
        const [ano, mes] = competencia.split('-').map(Number);
        const trimestre = Math.ceil(mes / 3);
        return { ano, trimestre };
    }

    // ==================== EXPORTAÇÃO CSV ====================

    exportToCSV() {
        const nfs = this.getAllInvoices();

        const headers = [
            'Número NF', 'Data Emissão', 'Competência', 'Contrato',
            'Valor Faturado', 'Equipamentos', 'PIS', 'COFINS', 'ISS', 'ICMS',
            'Trimestral', 'Total Impostos', 'Valor Líquido', 'Status', 'Data Recebimento'
        ];

        const rows = nfs.map(nf => [
            nf.numero_nf,
            nf.data_emissao,
            nf.competencia,
            nf.contratos_base?.nome_contrato || '',
            nf.valor_faturado,
            nf.numero_equipamentos || '',
            nf.pis,
            nf.cofins,
            nf.iss,
            nf.icms,
            nf.trimestral_provisao,
            nf.total_impostos,
            nf.valor_liquido,
            nf.status,
            nf.data_recebimento || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        return csvContent;
    }

    downloadCSV() {
        const csvContent = this.exportToCSV();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `gestao_integrada_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // ==================== VALIDAÇÃO ====================

    validateInvoice(invoiceData) {
        const errors = [];

        if (!invoiceData.contrato_id) errors.push('Contrato é obrigatório');
        if (!invoiceData.numero_nf || invoiceData.numero_nf.trim() === '') errors.push('Número da NF é obrigatório');
        if (!invoiceData.data_emissao) errors.push('Data de emissão é obrigatória');
        if (!invoiceData.competencia) errors.push('Competência é obrigatória');
        if (!invoiceData.valor_faturado || invoiceData.valor_faturado <= 0) errors.push('Valor faturado deve ser maior que zero');

        // Validar equipamentos se contrato exigir
        const contrato = this.getContractById(invoiceData.contrato_id);
        if (contrato && contrato.contrato_por_equipamentos) {
            if (!invoiceData.numero_equipamentos || invoiceData.numero_equipamentos <= 0) {
                errors.push('Número de equipamentos é obrigatório para este contrato');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

// Instância global
const supabaseStorage = new SupabaseStorageService();

// Para manter compatibilidade com código antigo
window.supabaseStorage = supabaseStorage;
