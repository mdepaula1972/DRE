/**
 * Importação de Dados DRE de Duas Fontes
 * 
 * Importa dados DRE de dois arquivos CSV baseado em data:
 * - dados_mai25.csv: Jan/2024 até Mai/2025
 * - dados_tratado_jun25_em_diante.csv: Jun/2025 em diante
 */

import fs from 'fs';
import iconv from 'iconv-lite';

// Configuração
const FILE_MAI25 = 'dados_mai25.csv';
const FILE_JUN25 = 'dados_tratado_jun25_em_diante.csv';

// Função para ler CSV com encoding correto (Windows-1252)
function readCSVFile(filename) {
    if (!fs.existsSync(filename)) {
        throw new Error(`Arquivo não encontrado: ${filename}`);
    }
    const buffer = fs.readFileSync(filename);
    const content = iconv.decode(buffer, 'win1252');
    return content;
}

// Função para parse CSV
function parseCSV(content, delimiter = ';') {
    const lines = content.split('\n').filter(line => line.trim());
    const headers = lines[0].split(delimiter).map(h => h.trim());

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map(v => v.trim());
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        data.push(row);
    }

    return { headers, data };
}

// Função para converter "jan/24" em "2024-01"
function parseCompetencia(comp) {
    if (!comp || !comp.includes('/')) return null;

    const meses = {
        'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04',
        'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08',
        'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
    };

    const [mes, ano] = comp.split('/');
    const anoCompleto = ano.length === 2 ? '20' + ano : ano;
    return `${anoCompleto}-${meses[mes.toLowerCase()]}`;
}

// Função para mesclar dados de ambos os arquivos
function mergeDataSources() {
    console.log('📊 Lendo arquivos DRE...\n');

    // Ler arquivo 1 (até mai/25) - ENCODING Windows-1252
    const content1 = readCSVFile(FILE_MAI25);
    const { headers: headers1, data: data1 } = parseCSV(content1);
    console.log(`✅ ${FILE_MAI25}: ${data1.length} registros`);

    // Ler arquivo 2 (jun/25 em diante) - ENCODING Windows-1252
    const content2 = readCSVFile(FILE_JUN25);
    const { headers: headers2, data: data2 } = parseCSV(content2);
    console.log(`✅ ${FILE_JUN25}: ${data2.length} registros\n`);

    // Extrair meses de cada arquivo
    const meses1 = headers1.filter(h => h.includes('/')).map(parseCompetencia).filter(Boolean);
    const meses2 = headers2.filter(h => h.includes('/')).map(parseCompetencia).filter(Boolean);

    console.log(`📅 Períodos identificados:`);
    console.log(`   Arquivo 1: ${meses1[0]} até ${meses1[meses1.length - 1]}`);
    console.log(`   Arquivo 2: ${meses2[0]} até ${meses2[meses2.length - 1]}\n`);

    // Normalizar dados (transformar colunas mensais em linhas)
    // Estratégia: Carregar TUDO de arquivo 1, depois arquivo 2 sobrescreve períodos duplicados
    const dataMap = new Map(); // key: empresa|projeto|categoria|competencia

    // Processar arquivo 1 (TODOS os períodos)
    data1.forEach(row => {
        meses1.forEach((compNorm, idx) => {
            const mesHeader = headers1.find(h => parseCompetencia(h) === compNorm);
            const valor = parseFloat(row[mesHeader]?.replace(',', '.')) || 0;

            if (valor !== 0) {
                const key = `${row['Empresa']}|${row['Projeto']}|${row['Categoria']}|${compNorm}`;
                dataMap.set(key, {
                    empresa: row['Empresa'],
                    projeto: row['Projeto'],
                    categoria: row['Categoria'],
                    competencia: compNorm,
                    valor: valor,
                    fonte: 'arquivo1'
                });
            }
        });
    });

    // Processar arquivo 2 (SOBRESCREVE se competência já existir)
    data2.forEach(row => {
        meses2.forEach((compNorm, idx) => {
            const mesHeader = headers2.find(h => parseCompetencia(h) === compNorm);
            const valor = parseFloat(row[mesHeader]?.replace(',', '.')) || 0;

            if (valor !== 0) {
                const key = `${row['Empresa']}|${row['Projeto']}|${row['Categoria']}|${compNorm}`;
                dataMap.set(key, {
                    empresa: row['Empresa'],
                    projeto: row['Projeto'],
                    categoria: row['Categoria'],
                    competencia: compNorm,
                    valor: valor,
                    fonte: 'arquivo2'
                });
            }
        });
    });

    // Converter Map para Array e remover campo 'fonte'
    const normalized = Array.from(dataMap.values()).map(({ fonte, ...item }) => item);

    // Ordenar por competência
    normalized.sort((a, b) => a.competencia.localeCompare(b.competencia));

    console.log(`✅ Total de lançamentos processados: ${normalized.length}\n`);

    // Estatísticas
    const porCompetencia = {};
    normalized.forEach(item => {
        porCompetencia[item.competencia] = (porCompetencia[item.competencia] || 0) + 1;
    });

    console.log('📈 Lançamentos por competência:');
    Object.keys(porCompetencia).sort().forEach(comp => {
        console.log(`   ${comp}: ${porCompetencia[comp]} lançamentos`);
    });

    return normalized;
}

// Salvar dados mesclados
function saveMergedData(data) {
    const outputFile = 'dados_dre_merged.json';
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`\n💾 Dados salvos em: ${outputFile}`);
}

// Executar
try {
    const mergedData = mergeDataSources();
    saveMergedData(mergedData);
    console.log('\n=========================================');
    console.log('✨ IMPORTAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('   O sistema agora usará os novos dados.');
    console.log('=========================================\n');
} catch (error) {
    console.error('\n❌ ERRO DURANTE A IMPORTAÇÃO:');
    console.error(`   ${error.message}`);
    process.exit(1);
}
