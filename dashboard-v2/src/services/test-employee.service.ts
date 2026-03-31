import { supabase } from '@/lib/supabase';

export class TestEmployeeService {
  // Criar colaborador teste (versão melhorada)
  static async createTestEmployee(): Promise<string | null> {
    try {
      // Criar employee básico primeiro
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .insert([{
          name: 'USUÁRIO TESTE DASHBOARD',
          company: 'MarBR',
          link_type: 'CLT',
          remuneration: 5000,
          is_test: true,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (empError) {
        console.error('Erro ao criar employee:', empError);
        
        // Se falhar, tentar versão mínima
        const { data: minEmployee, error: minError } = await supabase
          .from('employees')
          .insert([{
            name: 'USUÁRIO TESTE DASHBOARD',
            company: 'MarBR',
            is_test: true
          }])
          .select()
          .single();

        if (minError) throw minError;
        return minEmployee?.id || null;
      }

      // Criar alguns contratos de teste
      if (employee?.id) {
        await supabase
          .from('contracts')
          .insert([{
            employee_id: employee.id,
            employee_name: employee.name,
            company: employee.company,
            value: 3000,
            installment_value: 300,
            installments: 10,
            installments_paid: 0,
            balance: 3000,
            status: 'ATIVO',
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 10 * 30 * 24 * 60 * 60 * 1000).toISOString(),
            operation_number: 'TEST001',
            description: 'Empréstimo de teste',
            is_test: true
          }]);
      }

      return employee?.id || null;
    } catch (error) {
      console.error('Erro ao criar colaborador teste:', error);
      throw new Error(`Falha ao criar: ${(error as Error).message}`);
    }
  }

  // Remover todos os dados de teste
  static async removeTestData(): Promise<string> {
    try {
      // Remover contratos de teste
      const { error: contractError } = await supabase
        .from('contracts')
        .delete()
        .eq('is_test', true);

      if (contractError) {
        console.error('Erro ao remover contratos teste:', contractError);
      }

      // Remover employees de teste
      const { error: empError } = await supabase
        .from('employees')
        .delete()
        .eq('is_test', true);

      if (empError) {
        console.error('Erro ao remover employees teste:', empError);
      }

      return 'Dados de teste removidos com sucesso';
    } catch (error) {
      console.error('Erro ao remover dados de teste:', error);
      throw new Error(`Falha ao remover: ${(error as Error).message}`);
    }
  }

  // Verificar se existe colaborador teste
  static async hasTestEmployee(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('employee_loans_summary_test')
        .select('id')
        .limit(1);

      if (error) {
        console.error('Erro ao verificar colaborador teste:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Erro em hasTestEmployee:', error);
      return false;
    }
  }

  // Reverter uma operação (versão simplificada)
  static async revertOperation(operationId: string, userName: string = 'system'): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .update({ status: 'ATIVO' })
        .eq('id', operationId);

      if (error) {
        console.error('Erro ao reverter operação:', error);
        throw new Error(`Falha ao reverter: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Erro ao reverter operação:', error);
      throw new Error(`Falha ao reverter: ${(error as Error).message}`);
    }
  }

  // Buscar histórico de operações (versão simplificada)
  static async getOperationHistory(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Erro ao buscar histórico:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro em getOperationHistory:', error);
      return [];
    }
  }
}
