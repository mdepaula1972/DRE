import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.URL_Supabase;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
}

/**
 * API de Gestão Integrada de Faturamento
 * 
 * Endpoints:
 * - GET /api/gestao-integrada?type=init - Carregar dados iniciais
 * - GET /api/gestao-integrada?type=invoices - Listar todas as NFs
 * - GET /api/gestao-integrada?type=quarterly - Listar impostos trimestrais
 * - POST /api/gestao-integrada (action: create_invoice) - Criar NF
 * - POST /api/gestao-integrada (action: update_invoice) - Atualizar NF
 * - POST /api/gestao-integrada (action: delete_invoice) - Excluir NF
 * - POST /api/gestao-integrada (action: mark_paid) - Marcar NF como paga
 * - POST /api/gestao-integrada (action: save_quarterly) - Salvar configs trimestrais
 */
export default async function handler(req, res) {
    // Validar configuração do Supabase
    if (!supabase) {
        return res.status(500).json({
            error: "Configuração do Supabase incompleta.",
            details: "Verifique se as variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão configuradas no Vercel.",
            env_url_found: !!process.env.SUPABASE_URL,
            env_key_found: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        });
    }

    const { method } = req;

    try {
        // ==================== GET ====================
        if (method === 'GET') {
            const { type } = req.query;

            // Inicialização: carregar contratos
            if (type === 'init') {
                const { data: contratos, error } = await supabase
                    .from('contratos_base')
                    .select('*')
                    .eq('ativo', true)
                    .order('nome_contrato');

                if (error) throw error;

                return res.status(200).json({
                    success: true,
                    contratos: contratos || []
                });
            }

            // Listar todas as NFs com dados de contrato
            if (type === 'invoices') {
                const { data, error } = await supabase
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

                return res.status(200).json({
                    success: true,
                    data: data || []
                });
            }

            // Listar impostos trimestrais
            if (type === 'quarterly') {
                const { data, error } = await supabase
                    .from('impostos_trimestrais')
                    .select('*')
                    .order('ano', { ascending: false })
                    .order('trimestre', { ascending: true });

                if (error) throw error;

                return res.status(200).json({
                    success: true,
                    data: data || []
                });
            }

            return res.status(400).json({ error: 'Parâmetro "type" inválido' });
        }

        // ==================== POST ====================
        if (method === 'POST') {
            const { action } = req.body;

            // Criar nova nota fiscal
            if (action === 'create_invoice') {
                const { invoice } = req.body;

                const { data, error } = await supabase
                    .from('notas_fiscais')
                    .insert([invoice])
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

                return res.status(200).json({
                    success: true,
                    message: 'Nota fiscal criada com sucesso',
                    data
                });
            }

            // Atualizar nota fiscal existente
            if (action === 'update_invoice') {
                const { id, invoice } = req.body;

                const { data, error } = await supabase
                    .from('notas_fiscais')
                    .update(invoice)
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

                return res.status(200).json({
                    success: true,
                    message: 'Nota fiscal atualizada com sucesso',
                    data
                });
            }

            // Excluir nota fiscal
            if (action === 'delete_invoice') {
                const { id } = req.body;

                const { error } = await supabase
                    .from('notas_fiscais')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                return res.status(200).json({
                    success: true,
                    message: 'Nota fiscal excluída com sucesso'
                });
            }

            // Marcar nota fiscal como paga
            if (action === 'mark_paid') {
                const { id, data_recebimento, comissoes } = req.body;

                const updateData = {
                    status: 'Pago',
                    data_recebimento,
                    comissoes: comissoes || []
                };

                const { data, error } = await supabase
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

                return res.status(200).json({
                    success: true,
                    message: 'Nota fiscal marcada como paga',
                    data
                });
            }

            // Salvar configurações de impostos trimestrais
            if (action === 'save_quarterly') {
                const { configs } = req.body;

                // Upsert (insert or update)
                const { data, error } = await supabase
                    .from('impostos_trimestrais')
                    .upsert(configs, { onConflict: 'ano,trimestre' })
                    .select();

                if (error) throw error;

                return res.status(200).json({
                    success: true,
                    message: 'Configurações trimestrais salvas com sucesso',
                    data
                });
            }

            // Recalcular impostos trimestrais de todas as NFs de um trimestre
            if (action === 'recalculate_quarter') {
                const { ano, trimestre } = req.body;

                // Buscar todas as NFs do trimestre
                const competencias = getCompetenciasByQuarter(ano, trimestre);

                const { data: nfs, error: nfsError } = await supabase
                    .from('notas_fiscais')
                    .select('id, trimestral_provisao')
                    .in('competencia', competencias);

                if (nfsError) throw nfsError;

                return res.status(200).json({
                    success: true,
                    message: `${nfs.length} NFs encontradas para recálculo`,
                    data: nfs
                });
            }

            return res.status(400).json({ error: 'Ação inválida' });
        }

        // Método não permitido
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${method} Not Allowed`);

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            error: error.message,
            details: error.details || 'Erro interno do servidor'
        });
    }
}

/**
 * Helper: Retorna array de competências de um trimestre
 * @param {number} ano 
 * @param {number} trimestre (1-4)
 * @returns {string[]} Array de competências no formato "YYYY-MM"
 */
function getCompetenciasByQuarter(ano, trimestre) {
    const startMonth = (trimestre - 1) * 3 + 1;
    const competencias = [];

    for (let i = 0; i < 3; i++) {
        const mes = String(startMonth + i).padStart(2, '0');
        competencias.push(`${ano}-${mes}`);
    }

    return competencias;
}
