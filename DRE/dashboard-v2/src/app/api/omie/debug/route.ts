import { NextResponse } from 'next/server';

// GET /api/omie/debug - retorna raw da API Omie para diagnóstico
export async function GET() {
  const keys = [
    { name: 'Mar Brasil', key: process.env.OMIE_APP_KEY_MARBRASIL, secret: process.env.OMIE_APP_SECRET_MARBRASIL },
    { name: 'DZM', key: process.env.OMIE_APP_KEY_DZM, secret: process.env.OMIE_APP_SECRET_DZM }
  ].filter(k => k.key && k.secret);

  if (keys.length === 0) {
    return NextResponse.json({ error: 'Sem credenciais configuradas no Vercel.', env_keys: Object.keys(process.env).filter(k => k.startsWith('OMIE')) });
  }

  const d7 = new Date();
  d7.setDate(d7.getDate() - 7);
  const deStr = `${String(d7.getDate()).padStart(2,'0')}/${String(d7.getMonth()+1).padStart(2,'0')}/${d7.getFullYear()}`;

  const results: any[] = [];

  for (const app of keys) {
    const payload = {
      call: 'ListarContasPagar',
      app_key: app.key,
      app_secret: app.secret,
      param: [{
        pagina: 1,
        registros_por_pagina: 3,
        filtrar_por_data_de: deStr,
        filtrar_apenas_inclusao: "N",
        filtrar_apenas_alteracao: "S"
      }]
    };

    try {
      const res = await fetch('https://app.omie.com.br/api/v1/financas/contapagar/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      const firstRecord = (data.conta_pagar_cadastro || [])[0] || null;

      results.push({
        empresa: app.name,
        filtro_de: deStr,
        total_de_paginas: data.total_de_paginas,
        total_de_registros: data.total_de_registros,
        faultstring: data.faultstring || null,
        primeiro_registro_keys: firstRecord ? Object.keys(firstRecord) : null,
        primeiro_registro: firstRecord
      });
    } catch (e: any) {
      results.push({ empresa: app.name, error: e.message });
    }
  }

  return NextResponse.json({ date_filter: deStr, results });
}
