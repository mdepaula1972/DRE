/**
 * Validação do arquivo JSON gerado
 */

import fs from 'fs';

const data = JSON.parse(fs.readFileSync('dados_dre_merged.json', 'utf-8'));

console.log('📊 VALIDAÇÃO DO ARQUIVO JSON\n');
console.log(`✅ Total de registros: ${data.length}\n`);

// Validar estrutura
console.log('🔍 Validando estrutura dos registros...');
const camposObrigatorios = ['empresa', 'projeto', 'categoria', 'competencia', 'valor'];
let registrosValidos = 0;
let registrosInvalidos = 0;

data.forEach((item, idx) => {
    const camposFaltando = camposObrigatorios.filter(campo => !item[campo]);
    if (camposFaltando.length === 0) {
        registrosValidos++;
    } else {
        registrosInvalidos++;
        if (registrosInvalidos <= 5) {
            console.log(`  ⚠️  Registro ${idx}: faltam campos ${camposFaltando.join(', ')}`);
        }
    }
});

console.log(`✅ Registros válidos: ${registrosValidos}`);
console.log(`❌ Registros inválidos: ${registrosInvalidos}\n`);

// Estatísticas
console.log('📈 ESTATÍSTICAS:\n');

// Empresas
const empresas = [...new Set(data.map(d => d.empresa))];
console.log(`📌 Empresas encontradas (${empresas.length}):`);
empresas.forEach(e => console.log(`   - ${e}`));

// Categorias
const categorias = [...new Set(data.map(d => d.categoria))];
console.log(`\n📌 Categorias encontradas (${categorias.length}):`);
categorias.forEach(c => console.log(`   - ${c}`));

// Por competência
console.log(`\n📌 Total por competência:`);
const porComp = {};
data.forEach(item => {
    porComp[item.competencia] = (porComp[item.competencia] || 0) + item.valor;
});
Object.keys(porComp).sort().forEach(comp => {
    console.log(`   ${comp}: R$ ${porComp[comp].toFixed(2).replace('.', ',')}`);
});

// Exemplos de registros
console.log(`\n📄 EXEMPLOS DE REGISTROS:\n`);
[0, Math.floor(data.length / 2), data.length - 1].forEach(idx => {
    const item = data[idx];
    console.log(`Registro ${idx + 1}:`);
    console.log(`  Empresa: ${item.empresa}`);
    console.log(`  Projeto: ${item.projeto}`);
    console.log(`  Categoria: ${item.categoria}`);
    console.log(`  Competência: ${item.competencia}`);
    console.log(`  Valor: R$ ${item.valor.toFixed(2)}`);
    console.log('');
});

// Checagem de duplicatas
const chaves = data.map(d => `${d.empresa}|${d.projeto}|${d.categoria}|${d.competencia}`);
const duplicatas = chaves.length - new Set(chaves).size;
console.log(`🔍 Checagem de duplicatas: ${duplicatas === 0 ? '✅ Nenhuma' : `⚠️ ${duplicatas} encontradas`}\n`);

console.log('✨ Validação concluída!');
