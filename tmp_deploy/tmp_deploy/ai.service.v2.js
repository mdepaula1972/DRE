




const GEMINI_API_URL = "/api/chat";

class GeminiService {
    constructor() {
        // A chave não fica mais no código. 
        // Ela é gerenciada pelo servidor (Proxy) via variáveis de ambiente.
        this.apiKey = null;
    }

    isAuthenticated() {
        // Sempre retorna verdadeiro pois a autenticação é tratada no servidor Proxy
        return true;
    }

    setKey(key) {
        // Método mantido para compatibilidade, mas sem utilidade no modo Proxy
    }

    async generateAnalysis(contextData, userQuestion = null, signal = null) {
        const prompt = this._buildPrompt(contextData, userQuestion);
        const maxRetries = 3;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                if (signal && signal.aborted) {
                    throw new DOMException("The user aborted a request.", "AbortError");
                }

                const response = await fetch(GEMINI_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: prompt
                    }),
                    signal: signal
                });

                if (!response.ok) {
                    const errorData = await response.json();

                    if (response.status === 503 || response.status === 500) {
                        console.warn(`Tentativa ${attempt + 1} falhou: ${response.statusText}. Tentando novamente...`);
                        attempt++;
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        continue;
                    }

                    throw new Error(`Erro na IA: ${errorData.error?.message || response.statusText}`);
                }

                const data = await response.json();
                return data.candidates[0].content.parts[0].text;

            } catch (error) {
                // Se esgotou as tentativas ou é outro erro, lança
                if (attempt >= maxRetries - 1 || !error.message.includes("overloaded")) {
                    console.error("Erro ao chamar Gemini:", error);
                    if (error.message.includes("not found")) this.logAvailableModels();
                    throw error;
                }
                attempt++;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    async logAvailableModels() {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
            const data = await response.json();
            console.log("Modelos Disponíveis para sua chave:", data.models);
        } catch (e) {
            console.error("Erro ao listar modelos:", e);
        }
    }

    _buildPrompt(data, userQuestion) {
        // Truncate CSV Data if too large (Safety limit for API payload)
        const MAX_ROWS = 1500;
        let sanitizedData = { ...data };

        if (sanitizedData.csvData && Array.isArray(sanitizedData.csvData) && sanitizedData.csvData.length > MAX_ROWS) {
            console.warn(`BrisinhAI: Truncating CSV data from ${sanitizedData.csvData.length} to ${MAX_ROWS} rows.`);
            sanitizedData.csvData = sanitizedData.csvData.slice(0, MAX_ROWS);
            sanitizedData.note = "Dataset truncated for analysis limit.";
        }

        const contextString = JSON.stringify(sanitizedData, null, 2);
        let persona = `
Você é o BrisinhAI, um consultor financeiro especialista da empresa Mar Brasil.
Sua persona é amigável, técnica mas acessível. Use emojis ocasionalmente.
`;

        // Define specific instructions based on page type
        let focusArea = "";
        switch (data.pageType) {
            case 'DRE':
                focusArea = `
FOCO DA ANÁLISE (DRE):
1. Analise a saúde financeira focando em Receita Líquida, Margem de Contribuição, EBITDA e Lucro Líquido.
2. Identifique variações significativas nos custos e despesas.
3. Compare o realizado com métricas ideais de mercado se possível.
4. Sugira ações para redução de custos ou aumento de receita.
`;
                break;
            case 'PARCELAMENTOS':
                focusArea = `
FOCO DA ANÁLISE (PARCELAMENTOS):
1. Analise o perfil da dívida (curto vs longo prazo).
2. Destaque os maiores credores e a concentração de dívida.
3. Alerte sobre parcelas altas iminentes.
4. Sugira estratégias de renegociação ou amortização se o fluxo de caixa permitir.
`;
                break;
            case 'SEGUROS':
                focusArea = `
FOCO DA ANÁLISE (SEGUROS):
1. Analise a cobertura total e o custo dos prêmios.
2. Identifique apólices próximas do vencimento que precisam de renovação.
3. Verifique se há concentração excessiva em uma única seguradora ou corretor.
4. Sugira revisões de cobertura baseadas no custo-benefício.
`;
                break;
            case 'SETORIAL':
                focusArea = `
FOCO DA ANÁLISE (SETORIAL):
1. Identifique quais setores/centros de custo estão consumindo mais recursos.
2. Analise a eficiência de cada setor comparando gastos vs resultados (se disponíveis).
3. Aponte anomalias ou gastos fora do padrão (outliers).
`;
                break;
            default:
                focusArea = `
FOCO DA ANÁLISE (GERAL):
1. Analise os indicadores visíveis na tela.
2. Forneça insights sobre tendências e pontos de atenção.
`;
                break;
        }

        let basePrompt = `
${persona}
${focusArea}

Abaixo estão os dados capturados da tela atual (${data.pageType}):
${contextString}

Gere um relatório executivo conciso contendo:
- 📊 Resumo da Situação
- ✅ Pontos Fortes
- ⚠️ Pontos de Atenção
- 💡 Recomendações Práticas
`;

        if (userQuestion) {
            basePrompt = `
${persona}

Abaixo estão os dados capturados da tela atual (${data.pageType}):
${contextString}

O usuário (gestor) fez a seguinte pergunta:
"${userQuestion}"

Responda diretamente à pergunta usando os dados fornecidos. Se necessário, cite os números para embasar sua resposta.
`;
        }

        return basePrompt;
    }
}
