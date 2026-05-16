export interface DreFilters {
  empresas: string[];
  periodos: string[];
  projetos: string[];
  categorias: string[];
}

export interface DreSimulationParams {
  revenueMultiplier: number; // 1.0 = normal, 1.05 = +5%
  costsMultiplier: number;
  expensesMultiplier: number;
}

export interface DreRow {
  Projeto: string;
  Empresa: string;
  Categoria: string;
  [key: string]: string | number; // dynamic month columns, like "Jan/24"
}

export type DreItemType = 
  | 'linha' 
  | 'card' 
  | 'divisor' 
  | 'linha_calc' 
  | 'hidden' 
  | 'card_percentual';

export interface DreStructureItem {
  titulo: string;
  tipo: DreItemType;
  categorias?: string[];
  var?: string;
  formula?: string;
}

export interface DreTemplateDefinition {
  versao: string;
  nome: string;
  estrutura: DreStructureItem[];
}

export interface DreTotal {
  [key: string]: number;
}

export interface DreMensal {
  [titulo: string]: {
    [mesAno: string]: number;
  };
}

export interface DreKpis {
  receitaOperacional: number;
  receitaIndireta: number;
  totalEntradas: number;
  outrasEntradas: number;
  totalImpostos: number;
  totalCustos: number;
  totalDespesas: number;
  totalInvestimentos: number;
  totalSaidas: number;
  resultado: number;
  fcl: number;
  percLucro: number;
  percFcl: number;
  totalEquipamentos: number;
}

export interface DreCalculatedResult {
  totais: DreTotal;
  mensal: DreMensal;
  kpis: DreKpis;
  estrutura: DreStructureItem[];
  validColumns: string[]; // e.g., ["Jan/24", "Fev/24"]
  sourceRows?: Record<string, Record<string, DreRow[]>>; // For Data Lineage/Drill-down
}

export interface DreMetadata {
  empresas: string[];
  projetos: string[];
  categorias: string[];
  periodos: string[];
  mapaMeses: Record<string, string>;
}
