import { supabase } from '@/lib/supabase';

export class TestEmployeeService {
  // Criar colaborador teste
  static async createTestEmployee(): Promise<string | null> {
    const { data, error } = await supabase.rpc('create_test_employee');
    
    if (error) {
      console.error('Erro ao criar colaborador teste:', error);
      throw new Error(`Falha ao criar: ${error.message}`);
    }
    
    return data;
  }

  // Remover todos os dados de teste
  static async removeTestData(): Promise<string> {
    const { data, error } = await supabase.rpc('remove_test_data');
    
    if (error) {
      console.error('Erro ao remover dados de teste:', error);
      throw new Error(`Falha ao remover: ${error.message}`);
    }
    
    return data || 'Dados de teste removidos';
  }

  // Verificar se existe colaborador teste
  static async hasTestEmployee(): Promise<boolean> {
    const { data, error } = await supabase
      .from('employees')
      .select('id')
      .eq('is_test', true)
      .limit(1);
    
    if (error) {
      console.error('Erro ao verificar colaborador teste:', error);
      return false;
    }
    
    return data && data.length > 0;
  }

  // Reverter uma operação
  static async revertOperation(operationId: string, userName: string = 'system'): Promise<boolean> {
    const { data, error } = await supabase.rpc('revert_operation', {
      p_operation_id: operationId,
      p_reverted_by: userName
    });
    
    if (error) {
      console.error('Erro ao reverter operação:', error);
      throw new Error(`Falha ao reverter: ${error.message}`);
    }
    
    return data || false;
  }

  // Buscar histórico de operações
  static async getOperationHistory(): Promise<any[]> {
    const { data, error } = await supabase
      .from('loan_operations_history')
      .select('*')
      .eq('is_reverted', false)
      .order('performed_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar histórico:', error);
      return [];
    }
    
    return data || [];
  }
}
