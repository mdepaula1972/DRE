const fs = require('fs');
try {
    // Usando stream para evitar problemas de trava de arquivo se possível ou apenas lendo com tratamento
    const b = fs.readFileSync('Consolidado Faturamento.csv');
    // Detectar se é UTF-16 ou Latin1 (Excel as vezes salva CSV em formatos estranhos)
    const content = b.toString('binary');
    console.log('--- HEADER ---');
    console.log(content.split('\n')[0]);
    console.log('--- ROW 1 ---');
    console.log(content.split('\n')[1]);
} catch (e) {
    console.error('ERRO:', e.message);
}
