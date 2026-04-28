import { DreCalculatedResult } from '@/types/dre';

export interface DreAlert {
  id: string;
  type: 'danger' | 'warning' | 'info';
  title: string;
  message: string;
}

export class DreAlertsService {
  /**
   * Avalia a matriz consolidada do DRE e gera alertas determinísticos
   * baseados em thresholds (limiares) pré-configurados.
   */
  static generateAlerts(results: DreCalculatedResult): DreAlert[] {
    const alerts: DreAlert[] = [];
    const cols = results.validColumns;
    
    // Precisamos de pelo menos 2 meses para comparar MoM (Month over Month)
    if (cols.length < 2) return alerts;

    const currentMonth = cols[cols.length - 1];
    const previousMonth = cols[cols.length - 2];

    const formatPct = (val: number) => `${(val * 100).toFixed(1).replace('.', ',')}%`;

    // --- REGRA 1: QUEDA BRUSCA DE MARGEM FCL ---
    const fclM0 = results.mensal["Fluxo de Caixa Livre FCL"]?.[currentMonth] || 0;
    const fclM1 = results.mensal["Fluxo de Caixa Livre FCL"]?.[previousMonth] || 0;
    const recM0 = results.mensal["Total Entradas Operacionais"]?.[currentMonth] || 1; // Evita divisão por zero
    const recM1 = results.mensal["Total Entradas Operacionais"]?.[previousMonth] || 1;

    const marginM0 = fclM0 / recM0;
    const marginM1 = fclM1 / recM1;
    const marginDrop = marginM1 - marginM0;

    // Se a margem caiu mais de 5 pontos percentuais
    if (marginDrop > 0.05) {
      alerts.push({
        id: 'margin-drop',
        type: 'danger',
        title: 'Queda de Margem',
        message: `A margem do FCL caiu ${formatPct(marginDrop)} em ${currentMonth} comparado a ${previousMonth}. Verifique os custos deste período.`
      });
    }

    // --- REGRA 2: AUMENTO DE CUSTOS ACIMA DE 15% ---
    const costsM0 = results.mensal["Total Custos Operacionais"]?.[currentMonth] || 0;
    const costsM1 = results.mensal["Total Custos Operacionais"]?.[previousMonth] || 0;
    
    if (costsM1 > 0) {
      const costRise = (costsM0 - costsM1) / costsM1;
      if (costRise > 0.15) {
        alerts.push({
          id: 'costs-rise',
          type: 'warning',
          title: 'Escalada de Custos',
          message: `Custos Operacionais subiram ${formatPct(costRise)} em ${currentMonth}.`
        });
      }
    }

    // --- REGRA 3: AUMENTO DE DESPESAS ACIMA DE 15% ---
    const despM0 = results.mensal["Total Despesas Rateadas"]?.[currentMonth] || 0;
    const despM1 = results.mensal["Total Despesas Rateadas"]?.[previousMonth] || 0;
    
    if (despM1 > 0) {
      const despRise = (despM0 - despM1) / despM1;
      if (despRise > 0.15) {
        alerts.push({
          id: 'desp-rise',
          type: 'warning',
          title: 'Aumento de Despesas',
          message: `Despesas Rateadas cresceram ${formatPct(despRise)} em ${currentMonth}.`
        });
      }
    }

    // --- REGRA 4: QUEDA CONSECUTIVA DE RECEITA (3 Meses) ---
    if (cols.length >= 3) {
      const m2 = cols[cols.length - 3];
      const revM0 = results.mensal["Total Entradas Operacionais"]?.[currentMonth] || 0;
      const revM1 = results.mensal["Total Entradas Operacionais"]?.[previousMonth] || 0;
      const revM2 = results.mensal["Total Entradas Operacionais"]?.[m2] || 0;

      if (revM0 < revM1 && revM1 < revM2) {
        alerts.push({
          id: 'revenue-drop',
          type: 'danger',
          title: 'Tendência de Queda',
          message: `A Receita Operacional está caindo há 2 meses consecutivos (${m2} a ${currentMonth}).`
        });
      }
    }

    return alerts;
  }
}
