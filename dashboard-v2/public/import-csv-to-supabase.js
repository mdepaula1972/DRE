/**
 * Importação de Dados CSV para Supabase
 * 
 * Script para importar dados do Consolidado Faturamento.csv
 * para as tabelas do Supabase (contratos_base e notas_fiscais)
 */

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Configuração Supabase
const SUPABASE_URL = 'https://ngtjhwswbbivqajtpjvg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Funções auxiliares
function parseCSV(content) {
    const lines = content.split('\n').filter(line => line.trim());
    const headers = lines[0].split(';').map(h => h.trim());

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(';').map(v => v.trim());
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        data.push(row);
    }

    return data;
}

function parseDate(dateStr) {
    // Converte "02/12/2025" para "2025-12-02"
    if (!dateStr || dateStr === '') return null;
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
}

function parseCurrency(currencyStr) {
    // Converte "R$ 25.266,70" para 25266.70
    if (!currencyStr || currencyStr === '') return 0;
    return parseFloat(
        currencyStr
            .replace('R$', '')
            .replace(/\./g, '')  // Remove pontos de milhares
            .replace(',', '.')   // Substitui vírgula decimal por ponto
            .trim()
    );
}

function parseCiclo(ciclo) {
    // Converte "nov-25" para "2025-11"
    if (!ciclo || ciclo === '') return null;
    const meses = {
        'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04',
        'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08',
        'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
    };
    const [mes, ano] = ciclo.split('-');
    const anoCompleto = ano.length === 2 ? '20' + ano : ano;
    return `${anoCompleto}-${meses[mes.toLowerCase()]}`;
}

function extrairNomeContrato(contratoCompleto) {
    // "Contrato 1390/2024 - SESAP" → "SESAP"
    const match = contratoCompleto.match(/- (.+)$/);
    return match ? match[1].trim() : contratoCompleto;
}

function gerarNumeroNF(contratoNome, competencia, index) {
    // Gera número de NF fictício baseado no contrato e competência
    const [ano, mes] = competencia.split('-');
    return `NF-${contratoNome.replace(/\s+/g, '')}-${mes}${ano}-${String(index).padStart(3, '0')}`;
}

// Função principal de importação
async function importData() {
    console.log('🚀 Iniciando importação...\n');

    try {
        // 1. Ler arquivo CSV
        console.log('📖 Lendo arquivo CSV...');
        const csvContent = fs.readFileSync('Consolidado Faturamento.csv', 'utf-8');
        const rows = parseCSV(csvContent);
        console.log(`✅ ${rows.length} linhas encontradas\n`);

        // 2. Extrair contratos únicos
        console.log('🔍 Identificando contratos únicos...');
        const contratosMap = new Map();

        rows.forEach(row => {
            const contratoCompleto = row['Contrato'];
            const empresa = row['Empresa'];
            const nomeContrato = extrairNomeContrato(contratoCompleto);

            if (!contratosMap.has(nomeContrato)) {
                contratosMap.set(nomeContrato, {
                    nome_contrato: nomeContrato,
                    ativo: true,
                    tem_iss: false,
                    aliquota_iss: 0,
                    tem_icms: false,
                    aliquota_icms: 0,
                    contrato_por_equipamentos: false
                });
            }
        });

        console.log(`✅ ${contratosMap.size} contratos únicos identificados\n`);

        // 3. Inserir contratos no Supabase
        console.log('📤 Inserindo contratos no Supabase...');
        const contratos = Array.from(contratosMap.values());

        const { data: contratosInseridos, error: errorContratos } = await supabase
            .from('contratos_base')
            .upsert(contratos, {
                onConflict: 'nome_contrato',
                ignoreDuplicates: false
            })
            .select();

        if (errorContratos) {
            console.error('❌ Erro ao inserir contratos:', errorContratos);
            return;
        }

        console.log(`✅ ${contratosInseridos.length} contratos inseridos/atualizados\n`);

        // 4. Criar mapa de IDs de contratos
        const contratoIdMap = new Map();
        contratosInseridos.forEach(c => {
            contratoIdMap.set(c.nome_contrato, c.id);
        });

        // 5. Preparar notas fiscais
        console.log('📝 Preparando notas fiscais...');
        const notasFiscais = [];

        rows.forEach((row, index) => {
            const nomeContrato = extrairNomeContrato(row['Contrato']);
            const contratoId = contratoIdMap.get(nomeContrato);

            if (!contratoId) {
                console.warn(`⚠️  Contrato não encontrado: ${nomeContrato}`);
                return;
            }

            const competencia = parseCiclo(row['Ciclo']);
            const numeroNF = gerarNumeroNF(nomeContrato, competencia, index + 1);
            const valorFaturado = parseCurrency(row['Valor Faturado']);
            const valorLiquido = parseCurrency(row['Valor líquido']);
            const impostos = parseCurrency(row['Impostos']);

            const dataEmissao = parseDate(row['Emissão']);
            const dataConfirmacao = parseDate(row['Confirmação']);
            let status = row['Status'] || 'Pendente';

            // Se status é "Pago" mas não tem data de confirmação, mudar para Pendente
            if (status === 'Pago' && !dataConfirmacao) {
                status = 'Pendente';
            }

            // Pular linhas sem data de emissão (obrigatório)
            if (!dataEmissao) {
                return;
            }

            const nf = {
                contrato_id: contratoId,
                numero_nf: numeroNF,
                data_emissao: dataEmissao,
                data_recebimento: status === 'Pago' ? dataConfirmacao : null,
                competencia: competencia,
                valor_faturado: valorFaturado,
                numero_equipamentos: null,
                houve_retencao: false,
                valor_retido: 0,

                // Impostos
                pis: valorFaturado * 0.0065,
                cofins: valorFaturado * 0.03,
                iss: 0,
                icms: 0,
                trimestral_provisao: 0,

                // Totalização
                total_impostos: impostos,
                valor_liquido: valorLiquido,

                status: status,
                comissoes: []
            };

            notasFiscais.push(nf);
        });

        console.log(`✅ ${notasFiscais.length} notas fiscais preparadas\n`);

        // 6. Inserir notas fiscais no Supabase (em lotes de 100)
        console.log('📤 Inserindo notas fiscais no Supabase...');
        const batchSize = 100;
        let totalInseridas = 0;

        for (let i = 0; i < notasFiscais.length; i += batchSize) {
            const batch = notasFiscais.slice(i, i + batchSize);

            const { data, error } = await supabase
                .from('notas_fiscais')
                .insert(batch)
                .select();

            if (error) {
                console.error(`❌ Erro no lote ${Math.floor(i / batchSize) + 1}:`, error);
                continue;
            }

            totalInseridas += data.length;
            console.log(`  ✅ Lote ${Math.floor(i / batchSize) + 1}: ${data.length} NFs inseridas`);
        }

        console.log(`\n✅ Total: ${totalInseridas} notas fiscais inseridas com sucesso!\n`);

        // 7. Estatísticas
        console.log('📊 Estatísticas:');
        console.log(`   - Contratos: ${contratosInseridos.length}`);
        console.log(`   - Notas Fiscais: ${totalInseridas}`);
        console.log(`   - Valor Total Faturado: R$ ${notasFiscais.reduce((sum, nf) => sum + nf.valor_faturado, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        console.log(`   - Valor Total Líquido: R$ ${notasFiscais.reduce((sum, nf) => sum + nf.valor_liquido, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

        console.log('\n✨ Importação concluída com sucesso!\n');

    } catch (error) {
        console.error('💥 Erro durante importação:', error);
    }
}

// Executar importação
importData();
