// Using fetch to call Omie
const fetch = require('node-fetch'); // we can just use global fetch if node > 18
async function run() {
  const appKey = process.env.OMIE_APP_KEY_DZM || "2202607997577"; // fallback demo or read from env
  const appSecret = process.env.OMIE_APP_SECRET_DZM || "22fd2ba71abfa4ec6aeade652fb6a896";

  const req = await fetch('https://app.omie.com.br/api/v1/financas/contapagar/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      call: "ListarContasPagar",
      app_key: appKey,
      app_secret: appSecret,
      param: [{
        nPagina: 1,
        nRegPorPagina: 10,
        filtrar_por_data_de: "01/04/2026",
        filtrar_por_data_ate: "10/04/2026"
      }]
    })
  });
  console.log("Res1:", req.status, await req.text());
  
  const req2 = await fetch('https://app.omie.com.br/api/v1/financas/contapagar/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      call: "ListarContasPagar",
      app_key: appKey,
      app_secret: appSecret,
      param: [{
        nPagina: 1,
        nRegPorPagina: 5,
        filtrar_apenas_inclusao: "N",
        filtrar_apenas_alteracao: "S",
        dDtAltDe: "05/04/2026"
      }]
    })
  });
  console.log("Res2:", req2.status, await req2.text());
}
run();
