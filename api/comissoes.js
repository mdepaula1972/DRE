import { createClient } from '@supabase/supabase-js';

// Tries multiple naming variations for flexibility and warns if missing
const supabaseUrl = process.env.SUPABASE_URL || process.env.URL_Supabase;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
}

export default async function handler(req, res) {
    if (!supabase) {
        return res.status(500).json({
            error: "Configuração do Supabase incompleta.",
            details: "Verifique se as variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão configuradas no Vercel.",
            env_url_found: !!process.env.SUPABASE_URL,
            env_key_found: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            fallback_url_found: !!process.env.URL_Supabase,
            fallback_key_found: !!process.env.service_role
        });
    }
    // Add simple auth check (matching the one used in other API routes)
    // For now, assuming standard password check happens at index.html

    const { method } = req;

    try {
        switch (method) {
            case 'GET':
                const { type } = req.query;

                if (type === 'init') {
                    // Fetch basic data for the UI
                    // Load all members to allow management in the UI
                    const { data: equipe, error: eqError } = await supabase.from('equipe').select('*').order('nome');
                    if (eqError) throw new Error(`Erro tabela equipe: ${eqError.message}`);

                    const { data: contratos, error: ctError } = await supabase.from('contratos_base').select('*').order('nome_contrato');
                    if (ctError) throw new Error(`Erro tabela contratos_base: ${ctError.message}`);

                    return res.status(200).json({
                        equipe: equipe || [],
                        contratos: contratos || [],
                        equipe_count: equipe?.filter(m => m.ativo).length || 0,
                        contratos_count: contratos?.length || 0
                    });
                }

                if (type === 'history') {
                    // Fetch all commissions with their related receivements and contracts
                    const { data, error } = await supabase
                        .from('recebimentos')
                        .select(`
                            *,
                            contratos_base (nome_contrato),
                            comissoes (
                                id,
                                membro_id,
                                porcentagem,
                                valor_calculado,
                                status,
                                equipe (nome)
                            )
                        `)
                        .order('data_recebimento', { ascending: false });

                    if (error) throw error;
                    return res.status(200).json(data);
                }
                break;

            case 'POST':
                const { action } = req.body;

                // Action: Adicionar novo contrato
                if (action === 'add_contrato') {
                    const {
                        nome_contrato,
                        numero_contrato,
                        observacoes,
                        tem_iss,
                        aliquota_iss,
                        tem_icms,
                        aliquota_icms,
                        contrato_por_equipamentos
                    } = req.body;

                    const { data, error } = await supabase
                        .from('contratos_base')
                        .insert([{
                            nome_contrato,
                            numero_contrato: numero_contrato || null,
                            observacoes: observacoes || null,
                            ativo: true,
                            tem_iss: tem_iss || false,
                            aliquota_iss: aliquota_iss || 0,
                            tem_icms: tem_icms || false,
                            aliquota_icms: aliquota_icms || 0,
                            contrato_por_equipamentos: contrato_por_equipamentos || false
                        }])
                        .select()
                        .single();

                    if (error) throw error;
                    return res.status(200).json(data);
                }

                // Action: Adicionar novo membro da equipe
                if (action === 'add_equipe') {
                    const { nome, pct_padrao } = req.body;

                    const { data, error } = await supabase
                        .from('equipe')
                        .insert([{
                            nome,
                            pct_padrao: pct_padrao || 0,
                            ativo: true
                        }])
                        .select()
                        .single();

                    if (error) throw error;
                    return res.status(200).json(data);
                }

                // Action: Atualizar recebimento existente
                if (action === 'update_recebimento') {
                    const { id, contrato_id, data_recebimento, mes_ref, ano_ref, nota_fiscal, ciclo, valor_bruto, valor_liquido, divisoes } = req.body;

                    // 1. Atualizar Recebimento
                    const { error: recError } = await supabase
                        .from('recebimentos')
                        .update({
                            contrato_id,
                            data_recebimento,
                            mes_ref,
                            ano_ref,
                            nota_fiscal,
                            ciclo,
                            valor_bruto,
                            valor_liquido
                        })
                        .eq('id', id);

                    if (recError) throw recError;

                    // 2. Atualizar Comissões (Deletar e inserir novamente para garantir consistência da distribuição)
                    const { error: delError } = await supabase
                        .from('comissoes')
                        .delete()
                        .eq('recebimento_id', id);

                    if (delError) throw delError;

                    if (divisoes && divisoes.length > 0) {
                        const comissoesToInsert = divisoes.map(div => ({
                            recebimento_id: id,
                            membro_id: div.membro_id,
                            porcentagem: div.porcentagem,
                            valor_calculado: div.valor_comissao,
                            status: 'Pendente'
                        }));

                        const { error: comError } = await supabase.from('comissoes').insert(comissoesToInsert);
                        if (comError) throw comError;
                    }

                    return res.status(200).json({ success: true, message: 'Recebimento e comissões atualizados.' });
                }

                if (action === 'delete_recebimento') {
                    const { id: deleteId } = req.body;

                    // 1. Deletar comissões primeiro (FK constraint)
                    const { error: delComError } = await supabase
                        .from('comissoes')
                        .delete()
                        .eq('recebimento_id', deleteId);

                    if (delComError) throw delComError;

                    // 2. Deletar o recebimento
                    const { error: delRecError } = await supabase
                        .from('recebimentos')
                        .delete()
                        .eq('id', deleteId);

                    if (delRecError) throw delRecError;

                    return res.status(200).json({ success: true, message: 'Lançamento excluído com sucesso.' });
                }

                // Default: Create a new Receivement and its Commissions
                const { contrato_id, data_recebimento, mes_ref, ano_ref, nota_fiscal, ciclo, valor_bruto, valor_liquido, divisoes } = req.body;

                // 1. Insert Receivement
                const { data: recData, error: recError } = await supabase
                    .from('recebimentos')
                    .insert([{
                        contrato_id,
                        data_recebimento,
                        mes_ref,
                        ano_ref,
                        nota_fiscal,
                        ciclo,
                        valor_bruto,
                        valor_liquido
                    }])
                    .select()
                    .single();

                if (recError) throw recError;

                // 2. Insert Commissions for this receivement
                if (divisoes && divisoes.length > 0) {
                    const comissoesToInsert = divisoes.map(div => ({
                        recebimento_id: recData.id,
                        membro_id: div.membro_id,
                        porcentagem: div.porcentagem,
                        valor_calculado: div.valor_comissao,
                        status: 'Pendente'
                    }));

                    const { error: comError } = await supabase.from('comissoes').insert(comissoesToInsert);
                    if (comError) throw comError;
                }

                return res.status(200).json({ success: true, message: 'Recebimento e comissões registrados.' });

            default:
                res.setHeader('Allow', ['GET', 'POST']);
                return res.status(405).end(`Method ${method} Not Allowed`);
        }
    } catch (error) {
        console.error('Supabase Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
