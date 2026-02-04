const fs = require('fs');
try {
    const content = fs.readFileSync('Consolidado Faturamento.csv', 'latin1');
    console.log(content.split('\n').slice(0, 3).join('\n'));
} catch (e) {
    console.error(e);
}
