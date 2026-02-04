
const OMIE_API_URL = "https://app.omie.com.br/api/v1";

class OmieService {
    constructor() {
        this.appKey = localStorage.getItem('omie_app_key') || '';
        this.appSecret = localStorage.getItem('omie_app_secret') || '';
    }

    isAuthenticated() {
        return this.appKey && this.appSecret;
    }

    setCredentials(key, secret) {
        this.appKey = key;
        this.appSecret = secret;
        localStorage.setItem('omie_app_key', key);
        localStorage.setItem('omie_app_secret', secret);
    }

    async callApi(endpoint, call, param) {
        if (!this.isAuthenticated()) {
            throw new Error("Credenciais da API Omie não configuradas.");
        }

        const body = {
            call: call,
            app_key: this.appKey,
            app_secret: this.appSecret,
            param: [param]
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erro na API Omie (${response.status}): ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Erro na requisição Omie:", error);
            throw error;
        }
    }

    // --- Mappings ---

    async listCategories() {
        // Endpoint: Geral / Categorias
        // Método: ListarCategorias
        const result = await this.callApi(
            `${OMIE_API_URL}/geral/categorias/`,
            "ListarCategorias",
            { pagina: 1, registros_por_pagina: 500 } // Assuming < 500 categories for now, or implement pagination
        );

        const map = {};
        if (result.categoria_cadastro) {
            result.categoria_cadastro.forEach(cat => {
                map[cat.codigo] = cat.descricao;
            });
        }
        return map;
    }

    async listProjects() {
        // Endpoint: Geral / Projetos
        // Método: ListarProjetos
        const result = await this.callApi(
            `${OMIE_API_URL}/geral/projetos/`,
            "ListarProjetos",
            { pagina: 1, registros_por_pagina: 500 }
        );

        const map = {};
        if (result.cadastro) {
            result.cadastro.forEach(proj => {
                map[proj.codigo] = proj.nome;
            });
        }
        return map;
    }

    // --- Transactions ---

    async listLancamentos(dataInicio, dataFim) {
        // Endpoint: Finanças / Pesquisar Títulos
        // Método: PesquisarLancamentos
        let pagina = 1;
        const totalRegistros = [];
        let totalPaginas = 1;

        do {
            const param = {
                pagina: pagina,
                registros_por_pagina: 100,
                apenas_titulos_em_aberto: "N",
                dDtEmissaoDe: dataInicio,
                dDtEmissaoAte: dataFim,
                dDtVencDe: dataInicio, // Optional: filter by due date as well if needed
                dDtVencAte: dataFim
            };

            const result = await this.callApi(
                `${OMIE_API_URL}/financas/pesquisartitulos/`,
                "PesquisarLancamentos",
                param
            );

            if (result.titulos) {
                totalRegistros.push(...result.titulos);
                totalPaginas = result.total_de_paginas;
            }

            pagina++;
        } while (pagina <= totalPaginas);

        return totalRegistros;
    }

    // --- Main Sync Function ---

    async syncData(dataInicio, dataFim) {
        // 1. Fetch Mappings
        const [catMap, projMap] = await Promise.all([
            this.listCategories(),
            this.listProjects()
        ]);

        // 2. Fetch Transactions
        const rawTransactions = await this.listLancamentos(dataInicio, dataFim);

        // 3. Transform Data to App Format
        // App expects: { Empresa, Projeto, Categoria, "Jan/24": value, ... }
        // But actually, the app's internal processing (processParsedData) creates a list of objects where each object is a row from the CSV.
        // The CSV structure is pivoted: One row per (Empresa, Projeto, Categoria) with columns for months.
        // However, the internal logic `applyFilters` and `calculateDRE` iterates over `state.rawData`.
        // `state.rawData` is an array of objects.
        // The critical part is that `calculateDRE` sums values based on columns.

        // We need to transform the flat list of transactions into the pivoted format expected by the current logic,
        // OR refactor the logic to accept flat data.
        // Refactoring to accept flat data is cleaner but riskier.
        // Transforming to pivoted format keeps compatibility with the rest of the app.

        // Let's Pivot!
        const pivotedData = {}; // Key: "Empresa|Projeto|Categoria" -> Object

        rawTransactions.forEach(t => {
            const catNome = catMap[t.cCodCateg] || `Cat-${t.cCodCateg}`;
            const projNome = projMap[t.cCodProjeto] || `Proj-${t.cCodProjeto}`;
            // Empresa: Omie doesn't give "Empresa" name easily in the transaction. 
            // We can use a default or try to map from Client/Department.
            // For now, let's use a default "Mar Brasil" or similar, or map from Departamento if available.
            const empresa = "Mar Brasil"; // Simplification for now

            const key = `${empresa}|${projNome}|${catNome}`;

            if (!pivotedData[key]) {
                pivotedData[key] = {
                    Empresa: empresa,
                    Projeto: projNome,
                    Categoria: catNome
                };
            }

            // Determine Month Column (e.g., "Jan/24")
            // Use dDtPagamento (cash basis) or dDtVenc (accrual basis)?
            // Usually DRE is Accrual (Competência) -> dDtPrevisao or dDtVenc?
            // Or Cash (Caixa) -> dDtPagamento?
            // Let's use dDtVenc (Due Date) as a proxy for Competence for now, or dDtEmissao.
            // Better: Check if paid. If paid, use payment date? 
            // The user asked for "DRE", which is usually Competence. Let's use dDtVenc for now.
            const dateStr = t.dDtVenc; // "dd/mm/yyyy"
            if (dateStr) {
                const [day, month, year] = dateStr.split('/');
                const shortYear = year.slice(-2);
                const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
                const colName = `${monthNames[parseInt(month) - 1]}/${shortYear}`;

                if (!pivotedData[key][colName]) {
                    pivotedData[key][colName] = 0;
                }
                pivotedData[key][colName] += t.nValorTitulo;
            }
        });

        return Object.values(pivotedData);
    }
}
