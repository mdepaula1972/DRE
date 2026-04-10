import { LancamentosService } from '../src/services/lancamentos.service';

async function test() {
  const data = await LancamentosService.getLancamentos('2026-03-01');
  console.log("Qtd Lançamentos:", data.lancamentos.length);
  
  const cps = data.lancamentos.filter(x => x.fonte === 'CP').slice(0, 2);
  const movs = data.lancamentos.filter(x => x.fonte === 'MOV').slice(0, 2);

  console.log("CP Samples:", JSON.stringify(cps, null, 2));
  console.log("MOV Samples:", JSON.stringify(movs, null, 2));
}

test().catch(console.error);
