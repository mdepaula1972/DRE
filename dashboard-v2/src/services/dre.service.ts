import Papa from 'papaparse';
import { 
  DreRow, 
  DreFilters, 
  DreSimulationParams,
  DreCalculatedResult, 
  DreMetadata, 
  DreStructureItem 
} from '@/types/dre';

const MESES_ORDEM = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// A estrutura DRE agora é carregada dinamicamente via JSON (ex: dre-padrao.json)

const normalizeMes = (mes: string) => mes.trim().charAt(0).toUpperCase() + mes.trim().slice(1).toLowerCase();
const toTitleCase = (str: string) => str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());

export class DreService {
  /**
   * LAYER 1: PARSING
   * Realiza a leitura e conversão robusta do CSV (ISO-8859-1 -> UTF-8 fallback)
   */
  static parseCSV(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      // Try ISO-8859-1 with semicolon delimiter first (standard Brazilian CSV export format)
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: "ISO-8859-1",
        delimiter: ";",
        complete: (results) => {
          const headerCount = results.meta.fields ? results.meta.fields.length : 0;
          // A valid DRE CSV must have at least 3 columns (Empresa, Projeto, Categoria)
          if ((results.errors.length > 0 && results.data.length === 0) || headerCount < 3) {
            // Fallback: try UTF-8 with semicolon
            Papa.parse(file, {
              header: true,
              skipEmptyLines: true,
              encoding: "UTF-8",
              delimiter: ";",
              complete: (utfResults) => resolve(utfResults.data),
              error: (err) => reject(err)
            });
          } else {
            resolve(results.data);
          }
        },
        error: (err) => reject(err)
      });
    });
  }

  /**
   * LAYER 2: NORMALIZATION
   * Padroniza colunas, filtra linhas vazias e extrai metadados estruturais
   */
  static normalizeData(rawData: any[]): { data: DreRow[], metadata: DreMetadata } {
    let data = rawData.map(row => {
      const newRow: any = {};
      Object.keys(row).forEach(key => {
        const cleanKey = key.trim().replace(/["']/g, '');
        if (!cleanKey) return;

        const lowerKey = cleanKey.toLowerCase();
        let finalKey = cleanKey;

        if (lowerKey === 'projeto') finalKey = 'Projeto';
        else if (lowerKey === 'categoria') finalKey = 'Categoria';
        else if (lowerKey === 'empresa') finalKey = 'Empresa';

        newRow[finalKey] = row[key];
      });
      return newRow;
    });

    data = data.filter(row =>
      row['Projeto'] && row['Categoria'] &&
      row['Projeto'].toString().trim() !== '' && row['Categoria'].toString().trim() !== ''
    );

    data.forEach(row => {
      row['Projeto'] = toTitleCase(row['Projeto'].toString());
      row['Empresa'] = row['Empresa'] ? row['Empresa'].toString().trim() : '';
      row['Categoria'] = row['Categoria'] ? row['Categoria'].toString().trim() : '';
    });

    const allKeys = Object.keys(data[0] || {});
    const validCols = allKeys.filter(k => k.includes('/'));

    const periodos: { col: string, mes: string, ano: string, full: string }[] = [];
    const mapaMeses: Record<string, string> = {};

    validCols.forEach(col => {
      const partes = col.split('/');
      if (partes.length === 2) {
        const mesNormalizado = normalizeMes(partes[0].trim());
        mapaMeses[col] = mesNormalizado;
        periodos.push({ col, mes: mesNormalizado, ano: partes[1].trim(), full: col });
      }
    });

    periodos.sort((a, b) => {
      const yA = parseInt(a.ano) < 100 ? 2000 + parseInt(a.ano) : parseInt(a.ano);
      const yB = parseInt(b.ano) < 100 ? 2000 + parseInt(b.ano) : parseInt(b.ano);
      if (yA !== yB) return yA - yB;
      return MESES_ORDEM.indexOf(a.mes) - MESES_ORDEM.indexOf(b.mes);
    });

    const empresas = Array.from(new Set(data.map(d => d.Empresa).filter(Boolean))).sort() as string[];
    const projetos = Array.from(new Set(data.map(d => d.Projeto).filter(Boolean))).sort() as string[];
    const categorias = Array.from(new Set(data.map(d => d.Categoria).filter(Boolean))).sort() as string[];
    const periodosList = periodos.map(p => `${p.mes}/${p.ano}`);

    return {
      data: data as DreRow[],
      metadata: { empresas, projetos, categorias, periodos: periodosList, mapaMeses }
    };
  }

  /**
   * LAYER 3: CALCULATION
   * Processa os filtros, totaliza as categorias e executa a DRE estrutural baseada no legado
   */
  static calculate(
    data: DreRow[], 
    metadata: DreMetadata, 
    estrutura: DreStructureItem[],
    filters: DreFilters,
    simulationParams?: DreSimulationParams
  ): DreCalculatedResult {
    let df = [...data];

    if (filters.empresas.length > 0) df = df.filter(row => filters.empresas.includes(row.Empresa));
    if (filters.projetos.length > 0) df = df.filter(row => filters.projetos.includes(row.Projeto));
    if (filters.categorias.length > 0) df = df.filter(row => filters.categorias.includes(row.Categoria));

    const allCols = Object.keys(metadata.mapaMeses);
    let validColumns = allCols;

    if (filters.periodos.length > 0) {
      validColumns = allCols.filter(col => {
        const mes = metadata.mapaMeses[col];
        const ano = col.split('/')[1]?.trim();
        return filters.periodos.includes(`${mes}/${ano}`);
      });
    }

    const catTotals: Record<string, number> = {};
    const catMonthly: Record<string, Record<string, number>> = {};
    const catSourceRows: Record<string, Record<string, DreRow[]>> = {};

    df.forEach(row => {
      const cat = row.Categoria;
      if (!catTotals[cat]) {
        catTotals[cat] = 0;
        catMonthly[cat] = {};
        catSourceRows[cat] = {};
        validColumns.forEach(c => {
          catMonthly[cat][c] = 0;
          catSourceRows[cat][c] = [];
        });
      }

      let multiplier = 1;
      if (simulationParams) {
        if (['Receita Bruta de Vendas', 'Receitas Indiretas', 'Outras Receitas', 'Receitas Financeiras', 'Honorários', 'Juros e devoluções', 'Recuperação de Despesas Variáveis'].includes(cat)) {
          multiplier = simulationParams.revenueMultiplier;
        } else if (['Credenciado Operacional', 'Adiantamento - Credenciado Operacional', 'Terceirização de Mão de Obra', 'Despesas com Pessoal', 'Custo dos Serviços Prestados', 'Preventiva - B2G', 'Manutenção Preventiva', 'Corretiva - B2G', 'Manutenção Corretiva', 'Outros Custos'].includes(cat)) {
          multiplier = simulationParams.costsMultiplier;
        } else if (['Credenciado Administrativo', 'Adiantamento - Credenciado Administrativo', 'Credenciado TI', 'Adiantamento - Credenciado TI', 'Despesas Administrativas', 'Despesas de Vendas e Marketing', 'Despesas Financeiras', 'Outros Tributos', 'Jurídico', 'Despesas Variáveis', 'Intermediação de Negócios'].includes(cat)) {
          multiplier = simulationParams.expensesMultiplier;
        }
      }

      validColumns.forEach(col => {
        const val = parseFloat(row[col]?.toString().replace(',', '.') || '0');
        if (!isNaN(val)) {
          const simVal = val * multiplier;
          catTotals[cat] += simVal;
          catMonthly[cat][col] += simVal;
          if (val !== 0) catSourceRows[cat][col].push(row);
        }
      });
    });

    const getCatTotal = (targetCat: string) => {
      if (!targetCat) return 0;
      const exact = catTotals[targetCat];
      if (exact !== undefined) return exact;
      const key = Object.keys(catTotals).find(k => k.trim().toLowerCase() === targetCat.trim().toLowerCase());
      return key ? catTotals[key] : 0;
    };

    const getCatMonthly = (targetCat: string, col: string) => {
      if (!targetCat) return 0;
      const exact = catMonthly[targetCat]?.[col];
      if (exact !== undefined) return exact;
      const key = Object.keys(catMonthly).find(k => k.trim().toLowerCase() === targetCat.trim().toLowerCase());
      return key ? (catMonthly[key][col] || 0) : 0;
    };

    const valoresTotal: Record<string, number> = {};
    const valoresMensal: Record<string, Record<string, number>> = {};
    const sourceRows: Record<string, Record<string, DreRow[]>> = {};

    const servicosBaseTotal = getCatTotal('Serviços');
    const consorciosTotal = getCatTotal('Consórcios - a contemplar');

    estrutura.forEach(item => {
      if (item.tipo === 'linha' || item.tipo === 'hidden' || (item.tipo === 'card' && item.categorias)) {
        let total = 0;
        item.categorias?.forEach(cat => total += getCatTotal(cat));
        valoresTotal[item.titulo] = total;

        valoresMensal[item.titulo] = {};
        sourceRows[item.titulo] = {};
        validColumns.forEach(col => {
          let mesTotal = 0;
          let rowsForMonth: DreRow[] = [];
          item.categorias?.forEach(cat => {
            mesTotal += getCatMonthly(cat, col);
            if (catSourceRows[cat] && catSourceRows[cat][col]) {
              rowsForMonth.push(...catSourceRows[cat][col]);
            }
          });
          valoresMensal[item.titulo][col] = mesTotal;
          sourceRows[item.titulo][col] = rowsForMonth;
        });
      } else if (item.tipo === 'linha_calc' && item.formula === 'servicos_menos_consorcios') {
        let totalServicosAjustado = 0;
        if (servicosBaseTotal >= consorciosTotal) {
          totalServicosAjustado = servicosBaseTotal - consorciosTotal;
        }
        valoresTotal[item.titulo] = totalServicosAjustado;

        valoresMensal[item.titulo] = {};
        sourceRows[item.titulo] = {};
        validColumns.forEach(col => {
          const s = getCatMonthly('Serviços', col);
          const c = getCatMonthly('Consórcios - a contemplar', col);
          valoresMensal[item.titulo][col] = s >= c ? s - c : 0;
          
          let rowsForMonth: DreRow[] = [];
          if (s >= c) {
            if (catSourceRows['Serviços'] && catSourceRows['Serviços'][col]) rowsForMonth.push(...catSourceRows['Serviços'][col]);
            if (catSourceRows['Consórcios - a contemplar'] && catSourceRows['Consórcios - a contemplar'][col]) rowsForMonth.push(...catSourceRows['Consórcios - a contemplar'][col]);
          }
          sourceRows[item.titulo][col] = rowsForMonth;
        });
      }
    });

    const getVal = (key: string) => valoresTotal[key] || 0;

    const receitaOperacional = getVal("Receita Bruta de Vendas");
    const receitaIndireta = getVal("Receitas Indiretas");
    const totalEntradas = receitaOperacional + receitaIndireta;

    const outrasEntradas = getVal("Outras Receitas") + getVal("Receitas Financeiras") + getVal("Honorários") + getVal("Juros e Devoluções") + getVal("Recuperação de Despesas Variáveis");
    const totalImpostos = getVal("Impostos") + getVal("Provisão IRPJ e CSSL Trimestral");
    
    const totalCustos = getCatTotal("Credenciado Operacional") + getCatTotal("Adiantamento - Credenciado Operacional") +
      getVal("Terceirização de Mão de Obra") + getVal("CLTs") + getVal("Custo dos Serviços Prestados") + 
      getVal("Preventiva - B2G") + getVal("Corretiva - B2G") + getVal("Outros Custos");

    const totalDespesas = getVal("Credenciado Administrativo") + getVal("Credenciado TI") +
      getVal("Despesas Administrativas") + getVal("Despesas de Vendas e Marketing") + getVal("Despesas Financeiras") +
      getVal("Outros Tributos") + getVal("Despesas Eventuais") + getVal("Despesas Variáveis") + getVal("Intermediação de Negócios") +
      getCatTotal("Distribuição de Dividendos") + getCatTotal("Dividendos");

    const totalInvestimentos = getCatTotal("Consórcios - a contemplar") + getVal("Serviços") + getCatTotal("Ativos");
    const totalSaidas = totalImpostos + totalCustos + totalDespesas + totalInvestimentos;

    const resultado = totalEntradas + getVal("Ativos") + outrasEntradas - totalSaidas;
    const fcl = resultado - getVal("Ativos");
    
    // Novo: Equipamentos
    const totalEquipamentos = getCatTotal("Equipamentos");

    valoresTotal["Total Entradas Operacionais"] = totalEntradas;
    valoresTotal["Outras Entradas"] = outrasEntradas;
    valoresTotal["Total de Impostos"] = totalImpostos;
    valoresTotal["Total Custos Operacionais"] = totalCustos;
    valoresTotal["Total Despesas Rateadas"] = totalDespesas;
    valoresTotal["Total Investimentos"] = totalInvestimentos;
    valoresTotal["Total Saídas"] = totalSaidas;
    valoresTotal["Fluxo de Caixa Livre FCL"] = fcl;
    valoresTotal["Resultado Liquido Final"] = resultado;
    valoresTotal["Impostos Gerais"] = totalImpostos;

    const percLucro = totalEntradas !== 0 ? (resultado / totalEntradas * 100) : 0;
    const percFcl = totalEntradas !== 0 ? (fcl / totalEntradas * 100) : 0;
    
    valoresTotal["Lucro s/ Receita Operacional"] = percLucro;
    valoresTotal["FCL s/ Receita Operacional"] = percFcl;

    const getValMensal = (key: string, col: string) => (valoresMensal[key] && valoresMensal[key][col]) ? valoresMensal[key][col] : 0;
    const getSourceRowsMensal = (key: string, col: string) => (sourceRows[key] && sourceRows[key][col]) ? sourceRows[key][col] : [];
    const getCatSourceRowsSafe = (cat: string, col: string) => {
      const key = Object.keys(catSourceRows).find(k => k.trim().toLowerCase() === cat.trim().toLowerCase());
      return key && catSourceRows[key] && catSourceRows[key][col] ? catSourceRows[key][col] : [];
    };
    
    valoresMensal["Total Entradas Operacionais"] = {};
    valoresMensal["Outras Entradas"] = {};
    valoresMensal["Total de Impostos"] = {};
    valoresMensal["Total Custos Operacionais"] = {};
    valoresMensal["Total Despesas Rateadas"] = {};
    valoresMensal["Total Investimentos"] = {};
    valoresMensal["Total Saídas"] = {};
    valoresMensal["Fluxo de Caixa Livre FCL"] = {};
    valoresMensal["Lucro s/ Receita Operacional"] = {};
    valoresMensal["FCL s/ Receita Operacional"] = {};
    
    sourceRows["Total Entradas Operacionais"] = {};
    sourceRows["Outras Entradas"] = {};
    sourceRows["Total de Impostos"] = {};
    sourceRows["Total Custos Operacionais"] = {};
    sourceRows["Total Despesas Rateadas"] = {};
    sourceRows["Total Investimentos"] = {};
    sourceRows["Total Saídas"] = {};
    sourceRows["Fluxo de Caixa Livre FCL"] = {};

    validColumns.forEach(col => {
      const recOp = getValMensal("Receita Bruta de Vendas", col);
      const recInd = getValMensal("Receitas Indiretas", col);
      const totEnt = recOp + recInd;
      valoresMensal["Total Entradas Operacionais"][col] = totEnt;
      sourceRows["Total Entradas Operacionais"][col] = [...getSourceRowsMensal("Receita Bruta de Vendas", col), ...getSourceRowsMensal("Receitas Indiretas", col)];

      const outrasEnt = getValMensal("Outras Receitas", col) + getValMensal("Receitas Financeiras", col) + getValMensal("Honorários", col) + getValMensal("Juros e Devoluções", col) + getValMensal("Recuperação de Despesas Variáveis", col);
      valoresMensal["Outras Entradas"][col] = outrasEnt;
      sourceRows["Outras Entradas"][col] = [
        ...getSourceRowsMensal("Outras Receitas", col), ...getSourceRowsMensal("Receitas Financeiras", col), 
        ...getSourceRowsMensal("Honorários", col), ...getSourceRowsMensal("Juros e Devoluções", col), ...getSourceRowsMensal("Recuperação de Despesas Variáveis", col)
      ];

      const totImp = getValMensal("Impostos", col) + getValMensal("Provisão IRPJ e CSSL Trimestral", col);
      valoresMensal["Total de Impostos"][col] = totImp;
      sourceRows["Total de Impostos"][col] = [...getSourceRowsMensal("Impostos", col), ...getSourceRowsMensal("Provisão IRPJ e CSSL Trimestral", col)];

      const totCust = getCatMonthly("Credenciado Operacional", col) + getCatMonthly("Adiantamento - Credenciado Operacional", col) +
        getValMensal("Terceirização de Mão de Obra", col) + getValMensal("CLTs", col) + getValMensal("Custo dos Serviços Prestados", col) + 
        getValMensal("Preventiva - B2G", col) + getValMensal("Corretiva - B2G", col) + getValMensal("Outros Custos", col);
      valoresMensal["Total Custos Operacionais"][col] = totCust;
      sourceRows["Total Custos Operacionais"][col] = [
        ...getCatSourceRowsSafe("Credenciado Operacional", col), ...getCatSourceRowsSafe("Adiantamento - Credenciado Operacional", col),
        ...getSourceRowsMensal("Terceirização de Mão de Obra", col), ...getSourceRowsMensal("CLTs", col), ...getSourceRowsMensal("Custo dos Serviços Prestados", col),
        ...getSourceRowsMensal("Preventiva - B2G", col), ...getSourceRowsMensal("Corretiva - B2G", col), ...getSourceRowsMensal("Outros Custos", col)
      ];

      const totDesp = getValMensal("Credenciado Administrativo", col) + getValMensal("Credenciado TI", col) +
        getValMensal("Despesas Administrativas", col) + getValMensal("Despesas de Vendas e Marketing", col) + getValMensal("Despesas Financeiras", col) +
        getValMensal("Outros Tributos", col) + getValMensal("Despesas Eventuais", col) + getValMensal("Despesas Variáveis", col) + getValMensal("Intermediação de Negócios", col) +
        getCatMonthly("Distribuição de Dividendos", col) + getCatMonthly("Dividendos", col);
      valoresMensal["Total Despesas Rateadas"][col] = totDesp;
      sourceRows["Total Despesas Rateadas"][col] = [
        ...getSourceRowsMensal("Credenciado Administrativo", col), ...getSourceRowsMensal("Credenciado TI", col),
        ...getSourceRowsMensal("Despesas Administrativas", col), ...getSourceRowsMensal("Despesas de Vendas e Marketing", col), ...getSourceRowsMensal("Despesas Financeiras", col),
        ...getSourceRowsMensal("Outros Tributos", col), ...getSourceRowsMensal("Despesas Eventuais", col), ...getSourceRowsMensal("Despesas Variáveis", col), ...getSourceRowsMensal("Intermediação de Negócios", col),
        ...getCatSourceRowsSafe("Distribuição de Dividendos", col), ...getCatSourceRowsSafe("Dividendos", col)
      ];

      const totInv = getCatMonthly("Consórcios - a contemplar", col) + getValMensal("Serviços", col) + getCatMonthly("Ativos", col);
      valoresMensal["Total Investimentos"][col] = totInv;
      sourceRows["Total Investimentos"][col] = [
        ...getCatSourceRowsSafe("Consórcios - a contemplar", col), ...getSourceRowsMensal("Serviços", col), ...getCatSourceRowsSafe("Ativos", col)
      ];

      const totSai = totImp + totCust + totDesp + totInv;
      valoresMensal["Total Saídas"][col] = totSai;
      sourceRows["Total Saídas"][col] = [
        ...sourceRows["Total de Impostos"][col],
        ...sourceRows["Total Custos Operacionais"][col],
        ...sourceRows["Total Despesas Rateadas"][col],
        ...sourceRows["Total Investimentos"][col]
      ];
      
      const resCol = totEnt + getCatMonthly("Ativos", col) + outrasEnt - totSai;
      const fclCol = resCol - getCatMonthly("Ativos", col);
      
      valoresMensal["Fluxo de Caixa Livre FCL"][col] = fclCol;
      sourceRows["Fluxo de Caixa Livre FCL"][col] = [
        ...sourceRows["Total Entradas Operacionais"][col],
        ...sourceRows["Outras Entradas"][col],
        ...sourceRows["Total Saídas"][col]
      ];

      valoresMensal["Lucro s/ Receita Operacional"][col] = totEnt !== 0 ? (resCol / totEnt * 100) : 0;
      valoresMensal["FCL s/ Receita Operacional"][col] = totEnt !== 0 ? (fclCol / totEnt * 100) : 0;
    });

    return {
      totais: valoresTotal,
      mensal: valoresMensal,
      estrutura: estrutura,
      validColumns,
      sourceRows,
      kpis: {
        receitaOperacional,
        receitaIndireta,
        totalEntradas,
        outrasEntradas,
        totalImpostos,
        totalCustos,
        totalDespesas,
        totalInvestimentos,
        totalSaidas,
        resultado,
        fcl,
        percLucro,
        percFcl,
        totalEquipamentos
      }
    };
  }
}
