import { supabase } from '@/lib/supabase';

export class TestEmployeeService {
  // Criar colaborador teste (versão para tabelas de teste independentes)
  static async createTestEmployee(): Promise<string | null> {
    try {
      // 1. Criar employee básico na tabela de TESTE
      const { data: employee, error: empError } = await supabase
        .from('employees_test')
        .insert([{
          full_name: 'USUÁRIO TESTE DASHBOARD',
          company: 'MarBR',
          employment_type: 'CLT',
          remuneration: 5000,
          status: 'Ativo',
          start_date: new Date().toISOString()
        }])
        .select()
        .single();

      if (empError) {
        console.error('Erro ao criar employee_test:', empError);
        throw empError;
      }

      // 2. Criar um contrato de teste na tabela de TESTE
      if (employee?.id) {
        const now = new Date();
        const startCycle = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        await supabase
          .from('employee_loans_test') 
          .insert([{
            employee_id: employee.id,
            amount: 5000,
            installments: 10,
            start_cycle: startCycle,
            notes: 'Empréstimo de teste gerado automaticamente',
            request_date: new Date().toISOString(),
            paid_installments: 0,
            postponed_months: 0,
            amount_paid_extra: 0
          }]);
      }

      return employee?.id || null;
    } catch (error) {
      console.error('Erro ao criar colaborador teste:', error);
      throw new Error(`Falha ao criar: ${(error as Error).message}`);
    }
  }

  // Remover todos os dados das tabelas de teste
  static async removeTestData(): Promise<string> {
    try {
      // 1. Limpar empréstimos de teste
      const { error: loanError } = await supabase
        .from('employee_loans_test')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (loanError) console.error('Erro ao limpar employee_loans_test:', loanError);

      // 2. Limpar colaboradores de teste
      const { error: empError } = await supabase
        .from('employees_test')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (empError) console.error('Erro ao limpar employees_test:', empError);

      return 'Dados de teste removidos com sucesso';
    } catch (error) {
      console.error('Erro ao remover dados de teste:', error);
      throw new Error(`Falha ao remover: ${(error as Error).message}`);
    }
  }

  // Verificar se existe colaborador teste
  static async hasTestEmployee(): Promise<boolean> {
    try {
      // Consulta diretamente a tabela de teste (a view summary_test não existe)
      const { data, error } = await supabase
        .from('employee_loans_test')
        .select('id')
        .limit(1);

      if (error) {
        console.error('Erro ao verificar colaborador teste:', error);
        return false;
      }

      return data !== null && data.length > 0;
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
