"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle, Clock, Calendar, CreditCard, Loader2, AlertCircle, CheckSquare, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency, formatDate } from "@/services/loans.service";
import { PaymentsService, LoanPayment } from "@/services/payments.service";

interface PaymentProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthCycle?: string;
}

export function PaymentProcessingModal({ isOpen, onClose, monthCycle }: PaymentProcessingModalProps) {
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [stats, setStats] = useState({
    total: 0, pending: 0, paid: 0, postponed: 0,
    pendingAmount: 0, paidAmount: 0, postponedAmount: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postponedDate, setPostponedDate] = useState("");
  const [showPostponeInput, setShowPostponeInput] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Determinar mês atual se não fornecido
  const currentMonth = monthCycle || new Date().toISOString().slice(0, 7);

  useEffect(() => {
    if (isOpen) {
      loadPayments();
    }
  }, [isOpen, currentMonth]);

  const loadPayments = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const [paymentsData, statsData] = await Promise.all([
        PaymentsService.getPaymentsByMonth(currentMonth),
        PaymentsService.getMonthStats(currentMonth)
      ]);
      
      setPayments(paymentsData);
      setStats(statsData);
      setSelectedIds([]);
    } catch (err) {
      setError('Falha ao carregar parcelas');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const selectAllPending = () => {
    const pendingIds = payments
      .filter(p => p.status === 'PENDENTE')
      .map(p => p.id);
    setSelectedIds(pendingIds);
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleMarkAsPaid = async () => {
    if (selectedIds.length === 0) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      await PaymentsService.processBatch({
        payment_ids: selectedIds,
        action: 'PAGO'
      });
      
      setSuccessMessage(`${selectedIds.length} parcela(s) marcada(s) como PAGO`);
      await loadPayments();
    } catch (err) {
      setError('Falha ao marcar parcelas como pagas');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePostpone = async () => {
    if (selectedIds.length === 0 || !postponedDate) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      await PaymentsService.processBatch({
        payment_ids: selectedIds,
        action: 'POSTERGADO',
        postponed_date: postponedDate
      });
      
      setSuccessMessage(`${selectedIds.length} parcela(s) postergada(s) para ${postponedDate}`);
      setShowPostponeInput(false);
      setPostponedDate("");
      await loadPayments();
    } catch (err) {
      setError('Falha ao postergar parcelas');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAGO':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white"><CheckCircle size={10} /> PAGO</span>;
      case 'POSTERGADO':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white"><Clock size={10} /> POSTERGADO</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600"><AlertCircle size={10} /> PENDENTE</span>;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-4xl md:max-h-[85vh] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Processar Parcelas</h2>
                  <p className="text-sm text-slate-500">Mês: {currentMonth}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border-b border-slate-100">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Parcelas</p>
                <p className="text-xl font-black text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500">{formatCurrency(stats.pendingAmount + stats.paidAmount + stats.postponedAmount)}</p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                <p className="text-[10px] font-bold text-emerald-600 uppercase">Pagas</p>
                <p className="text-xl font-black text-emerald-600">{stats.paid}</p>
                <p className="text-xs text-emerald-600/70">{formatCurrency(stats.paidAmount)}</p>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                <p className="text-[10px] font-bold text-amber-600 uppercase">Pendentes</p>
                <p className="text-xl font-black text-amber-600">{stats.pending}</p>
                <p className="text-xs text-amber-600/70">{formatCurrency(stats.pendingAmount)}</p>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                </div>
              ) : error ? (
                <div className="p-4 text-center text-red-600 bg-red-50 rounded-xl">
                  {error}
                  <button 
                    onClick={loadPayments}
                    className="block mx-auto mt-2 text-sm font-bold underline"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : successMessage ? (
                <div className="p-4 text-center text-emerald-700 bg-emerald-50 rounded-xl mb-4">
                  <CheckCircle className="w-6 h-6 mx-auto mb-2" />
                  {successMessage}
                </div>
              ) : null}

              {/* Selection Actions */}
              {payments.length > 0 && (
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectAllPending}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <CheckSquare size={14} />
                      Selecionar Pendentes
                    </button>
                    {selectedIds.length > 0 && (
                      <button
                        onClick={clearSelection}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1"
                      >
                        <Square size={14} />
                        Limpar ({selectedIds.length})
                      </button>
                    )}
                  </div>
                  
                  {selectedIds.length > 0 && (
                    <div className="flex items-center gap-2">
                      {!showPostponeInput ? (
                        <>
                          <button
                            onClick={() => setShowPostponeInput(true)}
                            className="px-3 py-1.5 text-xs font-bold text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-all"
                          >
                            <Clock size={12} className="inline mr-1" />
                            Postergar
                          </button>
                          <button
                            onClick={handleMarkAsPaid}
                            disabled={isProcessing}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50"
                          >
                            {isProcessing ? <Loader2 size={12} className="animate-spin inline mr-1" /> : <CheckCircle size={12} className="inline mr-1" />}
                            Marcar Pago
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={postponedDate}
                            onChange={(e) => setPostponedDate(e.target.value)}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1"
                          />
                          <button
                            onClick={handlePostpone}
                            disabled={!postponedDate || isProcessing}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-all disabled:opacity-50"
                          >
                            {isProcessing ? <Loader2 size={12} className="animate-spin" /> : 'OK'}
                          </button>
                          <button
                            onClick={() => { setShowPostponeInput(false); setPostponedDate(''); }}
                            className="text-xs font-bold text-slate-400 hover:text-slate-600"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Payments List */}
              <div className="space-y-2">
                {payments.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">Nenhuma parcela encontrada para este mês</p>
                ) : (
                  payments.map((payment) => (
                    <div
                      key={payment.id}
                      className={`p-3 rounded-xl border transition-all ${
                        selectedIds.includes(payment.id)
                          ? 'border-emerald-300 bg-emerald-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => payment.status === 'PENDENTE' && toggleSelection(payment.id)}
                          className={payment.status === 'PENDENTE' ? 'cursor-pointer' : 'cursor-not-allowed opacity-30'}
                        >
                          {selectedIds.includes(payment.id) ? (
                            <CheckSquare size={20} className="text-emerald-600" />
                          ) : (
                            <Square size={20} className="text-slate-300" />
                          )}
                        </button>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-900">
                              {(payment as any).contracts?.employee_name || 'Funcionário'}
                            </p>
                            <span className="text-[10px] text-slate-400">
                              OP #{(payment as any).contracts?.operation_number || '---'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar size={10} />
                              Venc: {formatDate(payment.due_date)}
                            </span>
                            <span className="font-bold text-slate-900">
                              {formatCurrency(payment.amount)}
                            </span>
                            {payment.postponed_to && (
                              <span className="text-amber-600">
                                → {formatDate(payment.postponed_to)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div>{getStatusBadge(payment.status)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
