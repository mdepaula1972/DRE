import { supabase } from '@/lib/supabase';
import { DreSimulationParams } from '@/types/dre';

export interface DreSimulationRecord {
  id?: string;
  created_at?: string;
  titulo: string;
  empresa_context: string;
  revenue_multiplier: number;
  costs_multiplier: number;
  expenses_multiplier: number;
  fcl_target?: number | null;
}

const TABLE_NAME = 'dre_simulations';

export class DreSupabaseService {
  /**
   * Salva um novo cenário no Supabase
   */
  static async saveSimulation(
    titulo: string,
    empresaContext: string,
    params: DreSimulationParams,
    fclTarget?: number
  ): Promise<{ data: any; error: any }> {
    const record: DreSimulationRecord = {
      titulo,
      empresa_context: empresaContext,
      revenue_multiplier: params.revenueMultiplier,
      costs_multiplier: params.costsMultiplier,
      expenses_multiplier: params.expensesMultiplier,
      fcl_target: fclTarget || null,
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([record])
      .select();

    return { data, error };
  }

  /**
   * Busca todas as simulações para uma determinada empresa (Global)
   */
  static async getSimulationsByEmpresa(empresaContext: string): Promise<DreSimulationRecord[]> {
    if (!empresaContext) return [];

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('empresa_context', empresaContext)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar simulações:', error);
      return [];
    }

    return data as DreSimulationRecord[];
  }

  /**
   * Deleta uma simulação específica
   */
  static async deleteSimulation(id: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);
      
    return { error };
  }
}
