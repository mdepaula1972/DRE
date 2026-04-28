import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Instanciar o SDK do Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { kpis, maioresDespesas, empresa, periodo } = body;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        analysis: "A chave de API do Gemini não está configurada no servidor (Vercel). Por favor, configure a variável GEMINI_API_KEY."
      });
    }

    // Preparar o modelo
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Construir o Prompt Executivo
    const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const prompt = `
Você é o "BrisinhAI", um CFO virtual altamente experiente e pragmático.
Escreva uma análise financeira executiva de 2 a 3 parágrafos sobre os seguintes resultados da empresa. 
Seja direto, profissional, não use saudações. Foque em apontar se o faturamento cobre as despesas, o nível da margem de lucro e faça um alerta ou recomendação final se necessário.

Dados do Contexto:
- Empresa: ${empresa}
- Período Analisado: ${periodo}

Indicadores (KPIs):
- Receita Bruta (Faturamento): ${formatBRL(kpis.receitaBruta)}
- Custos Operacionais: ${formatBRL(kpis.custos)}
- Despesas Administrativas: ${formatBRL(kpis.despesas)}
- Ponto de Equilíbrio (Breakeven): ${formatBRL(kpis.pontoEquilibrio)}
- Lucro Líquido: ${formatBRL(kpis.lucroLiquido)}
- Fluxo de Caixa Livre (FCL): ${formatBRL(kpis.fcl)}
- Margem Operacional: ${kpis.margemOperacional.toFixed(2)}%

Maiores Despesas Observadas:
${maioresDespesas.map((d: any) => `- ${d.nome}: ${formatBRL(d.valor)}`).join('\n')}

Por favor, gere a análise executiva em texto corrido, sem usar Markdown pesados (apenas texto puro, pois será impresso em um PDF formal).
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ analysis: text });
    
  } catch (error: any) {
    console.error("Erro na API da BrisinhAI:", error);
    return NextResponse.json(
      { error: "Falha na comunicação com a Inteligência Artificial." },
      { status: 500 }
    );
  }
}
