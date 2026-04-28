import { DreCalculatedResult } from "@/types/dre";

export class BrisinhaiService {
  static async analyzeDre(results: DreCalculatedResult, empresa: string, periodo: string): Promise<string> {
    try {
      // Extraindo métricas chave para a IA
      const kpis = {
        receitaBruta: results.totais["Total Entradas Operacionais"] || 0,
        custos: results.totais["Total Custos Operacionais"] || 0,
        despesas: results.totais["Total Despesas Rateadas"] || 0,
        lucroLiquido: results.kpis.lucroLiquido || 0,
        fcl: results.kpis.fcl || 0,
        margemOperacional: results.kpis.margemOperacional || 0,
        pontoEquilibrio: results.kpis.pontoEquilibrio || 0
      };

      // Pegando as 3 maiores despesas
      const maioresDespesas = Object.entries(results.mensal)
        .filter(([_, value]) => value > 0) // despesas são positivas aqui dependendo da formula, vamos checar
        .map(([nome, valor]) => ({ nome, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 3);

      const payload = {
        kpis,
        maioresDespesas,
        empresa,
        periodo
      };

      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Erro na resposta da API BrisinhAI");
      }

      const data = await response.json();
      return data.analysis || "Não foi possível gerar a análise.";
    } catch (error) {
      console.error("BrisinhAI Error:", error);
      return "Análise temporariamente indisponível devido a um erro de conexão com a IA.";
    }
  }
}
