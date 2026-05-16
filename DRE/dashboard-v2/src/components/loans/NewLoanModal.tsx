import { useState, useEffect } from 'react';
import { X, AlertCircle, Save, FileText, FileSignature, CheckCircle2 } from 'lucide-react';
import { useDataMode } from '@/contexts/DataModeContext';
import { LoansService, fetchEmployees } from '@/services/loans.service';

interface NewLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onGenerateTerm: (loanData: any) => void;
}

export function NewLoanModal({ isOpen, onClose, onSuccess, onGenerateTerm }: NewLoanModalProps) {
  const { isTestMode } = useDataMode();
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeDetails, setEmployeeDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    employee_id: '',
    amount: '',
    installments: '',
    start_cycle: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'),
    request_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [createdLoan, setCreatedLoan] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadEmployees();
      setStep('form');
      setFormData(prev => ({ 
        ...prev, 
        employee_id: '', 
        amount: '', 
        installments: '', 
        request_date: new Date().toISOString().split('T')[0],
        notes: '' 
      }));
    }
  }, [isOpen, isTestMode]);

  useEffect(() => {
    if (formData.employee_id) {
       LoansService.getEmployeeDetails(formData.employee_id, isTestMode)
         .then(setEmployeeDetails)
         .catch(err => console.error(err));
    } else {
       setEmployeeDetails(null);
    }
  }, [formData.employee_id, isTestMode]);

  const loadEmployees = async () => {
    try {
      const emps = await fetchEmployees(isTestMode);
      setEmployees(emps);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  // Lógica de Auditoria (Sinalização)
  const selectedEmpRaw = employees.find(e => e.id === formData.employee_id);
  const requestedAmount = parseFloat(formData.amount.replace(',', '.')) || 0;
  
  let marginAvailable = 0;
  let marginError: string | null = null;
  let tenureError: string | null = null;

  if (selectedEmpRaw && employeeDetails) {
    marginAvailable = employeeDetails.remuneration - employeeDetails.balance;
    if (requestedAmount > marginAvailable && requestedAmount > 0) {
      marginError = `O valor excede a margem. Salário (R$ ${employeeDetails.remuneration.toFixed(2)}) - Dívida Ativa (R$ ${employeeDetails.balance.toFixed(2)}) = Margem Livre de R$ ${marginAvailable.toFixed(2)}`;
    }

    if (selectedEmpRaw.start_date) {
      // Forçamos o timezone pro mês não voltar dependendo de que horas cai o dia (hack simples splitando)
      const dataStr = selectedEmpRaw.start_date.split('T')[0];
      const start = new Date(`${dataStr}T00:00:00`); 
      const now = new Date();
      const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      
      if (diffMonths < 6) {
        tenureError = `Colaborador possui Menos de 6 meses de empresa (Admissão: ${start.toLocaleDateString('pt-BR')}).`;
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (marginError || tenureError) {
      if (!confirm('Existem alertas de auditoria (margem excedida ou tempo de casa inferior a 6 meses).\nDeseja autorizar excepcionalmente esta operação?')) return;
    }

    if (!isTestMode) {
      if (!confirm('💥 ATENÇÃO: Você está adicionando um empréstimo na BASE DE PRODUÇÃO REAL. Continuar com a operação?')) return;
    }
    
    setIsLoading(true);
    try {
      const resp = await LoansService.createLoan({
        employee_id: formData.employee_id,
        amount: parseFloat(formData.amount.replace(',', '.')),
        installments: parseInt(formData.installments),
        start_cycle: formData.start_cycle,
        request_date: formData.request_date ? formData.request_date + 'T12:00:00.000Z' : new Date().toISOString(),
        notes: formData.notes
      }, isTestMode);
      
      setCreatedLoan(resp);
      setStep('success');
      onSuccess();
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b transition-colors ${isTestMode ? 'bg-amber-100 border-amber-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isTestMode ? 'bg-amber-200 text-amber-700' : 'bg-red-200 text-red-700'}`}>
              <AlertCircle size={20} />
            </div>
            <div>
              <h2 className={`font-bold text-lg leading-none ${isTestMode ? 'text-amber-900' : 'text-red-900'}`}>
                Novo Empréstimo
              </h2>
              <p className={`text-xs mt-1 font-semibold ${isTestMode ? 'text-amber-700' : 'text-red-700'}`}>
                {isTestMode ? "⚠️ MODO TESTE: Ambiente Sandbox Isolado" : "🚨 AVISO DE SEGURANÇA: BASE DE PRODUÇÃO REAL ATIVA"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {step === 'form' ? (
            <form id="loanForm" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Colaborador Associado</label>
                <select 
                  required
                  value={formData.employee_id}
                  onChange={e => setFormData({...formData, employee_id: e.target.value})}
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-primary focus:ring-primary px-3 py-2 text-sm bg-slate-50 border"
                >
                  <option value="">Selecione...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
                
                {/* Janela de Auditoria */}
                {formData.employee_id && (marginError || tenureError) && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg shadow-sm">
                    <h4 className="text-[10px] font-black uppercase text-red-500 mb-1 flex items-center gap-1"><AlertCircle size={12}/> Auditoria Interna (Alerta)</h4>
                    {tenureError && <p className="text-xs font-semibold text-red-700 leading-tight mb-1">• {tenureError}</p>}
                    {marginError && <p className="text-xs font-semibold text-red-700 leading-tight">• {marginError}</p>}
                  </div>
                )}
                
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-primary focus:ring-primary px-3 py-2 text-sm bg-slate-50 border font-mono"
                    placeholder="Ex: 1500.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Qtd. de Parcelas</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.installments}
                    onChange={e => setFormData({...formData, installments: e.target.value})}
                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-primary focus:ring-primary px-3 py-2 text-sm bg-slate-50 border font-mono"
                    placeholder="Ex: 5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data da Tomada (Assinatura)</label>
                  <input
                    type="date"
                    required
                    value={formData.request_date}
                    onChange={e => setFormData({...formData, request_date: e.target.value})}
                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-primary focus:ring-primary px-3 py-2 text-sm bg-slate-50 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Início do Desconto (Ciclo)</label>
                  <input
                    type="month"
                    required
                    value={formData.start_cycle}
                    onChange={e => setFormData({...formData, start_cycle: e.target.value})}
                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-primary focus:ring-primary px-3 py-2 text-sm bg-slate-50 border"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações (Opcional)</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-primary focus:ring-primary px-3 py-2 text-sm bg-slate-50 border h-20 resize-none"
                  placeholder="Anotações para a folha de pagamento..."
                ></textarea>
              </div>
            </form>
          ) : (
            <div className="text-center py-6 fade-in">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Empréstimo Registrado!</h3>
              <p className="text-sm text-slate-500 mb-8">
                O contrato já está computado na base financeira {isTestMode ? 'de teste' : 'real'}. <br/>Deseja gerar o Termo de Assinatura agora para evitar retrabalho?
              </p>
              
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <button 
                  onClick={() => {
                    onGenerateTerm(createdLoan);
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white hover:bg-slate-900 py-3 rounded-xl font-medium transition-colors shadow-sm"
                >
                  <FileSignature size={18} />
                  Gerar Termo de Assinatura
                </button>
                <button 
                  onClick={onClose}
                  className="w-full py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-100 hover:border-slate-200 border border-transparent transition-colors"
                >
                  Fechar Janela
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'form' && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="loanForm"
              disabled={isLoading}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold text-white transition-all shadow-sm disabled:opacity-50 ${isTestMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              <Save size={16} />
              {isLoading ? 'Salvando...' : 'Confirmar e Lançar Dados'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
