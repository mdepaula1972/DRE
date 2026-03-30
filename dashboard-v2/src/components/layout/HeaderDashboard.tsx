"use client";

import { useState, useEffect } from "react";
import { PlusCircle, FileText, Users, Home, Box, CheckCircle2, FlaskConical, UserPlus, Trash2 } from "lucide-react";
import { useDataMode } from "@/contexts/DataModeContext";
import { APP_VERSION } from "@/version";
import { TestEmployeeService } from "@/services/test-employee.service";

export function HeaderDashboard() {
  const { dataMode, setDataMode, isTestMode } = useDataMode();
  const [hasTestEmployee, setHasTestEmployee] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    checkTestEmployee();
  }, []);

  const checkTestEmployee = async () => {
    const exists = await TestEmployeeService.hasTestEmployee();
    setHasTestEmployee(exists);
  };

  const handleCreateTestEmployee = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const id = await TestEmployeeService.createTestEmployee();
      if (id) {
        setMessage('Colaborador teste criado!');
        setHasTestEmployee(true);
        window.location.reload();
      }
    } catch (error) {
      setMessage('Erro ao criar: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveTestData = async () => {
    if (!confirm('Tem certeza que deseja remover todos os dados de teste?')) return;
    
    setIsLoading(true);
    setMessage(null);
    try {
      const result = await TestEmployeeService.removeTestData();
      setMessage(result);
      setHasTestEmployee(false);
      window.location.reload();
    } catch (error) {
      setMessage('Erro ao remover: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      {/* Logo Section */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          {/* Logo Cube Icon */}
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-500 rounded-lg shadow-lg flex items-center justify-center">
              <Box className="w-7 h-7 text-white" strokeWidth={2} />
            </div>
            {/* Decorative shadow element */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-amber-600/20 rounded-lg -z-10" />
          </div>
          
          {/* Brand Text */}
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-slate-900 tracking-tight">MAR BRASIL</span>
              <span className="text-[10px] font-mono bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">{APP_VERSION}</span>
            </div>
            <span className="text-xs font-medium text-slate-500">Serviços e Locações</span>
          </div>
        </div>

        {/* Title */}
        <div className="hidden md:block ml-4 pl-4 border-l border-slate-200">
          <h1 className="text-xl font-bold text-slate-800 leading-tight">
            Empréstimos
          </h1>
          <p className="text-xs text-slate-500">
            Consolidação, acompanhamento e histórico gerencial
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm">
          <PlusCircle size={18} />
          <span>Novo Empréstimo</span>
        </button>
        
        <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all border border-slate-200">
          <FileText size={18} />
          <span>Gerar Termo</span>
        </button>

        <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all border border-slate-200">
          <Users size={18} />
          <span>PeopleBoard</span>
        </button>

        <button className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm">
          <Home size={18} />
          <span>Voltar ao Início</span>
        </button>

        {/* Data Mode Selector */}
        <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
          <span className="text-xs text-slate-500 font-medium hidden lg:block">Dados:</span>
          <select
            value={dataMode}
            onChange={(e) => setDataMode(e.target.value as "production" | "test")}
            className={`text-xs font-bold px-3 py-2 rounded-lg border-2 outline-none transition-all cursor-pointer ${
              isTestMode
                ? "bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200"
                : "bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200"
            }`}
          >
            <option value="production">Produção</option>
            <option value="test">Teste</option>
          </select>
          {isTestMode ? (
            <FlaskConical size={16} className="text-amber-500" />
          ) : (
            <CheckCircle2 size={16} className="text-emerald-500" />
          )}
        </div>

        {/* Test Employee Management */}
        <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
          {!hasTestEmployee ? (
            <button
              onClick={handleCreateTestEmployee}
              disabled={isLoading}
              className="flex items-center gap-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded-lg text-xs font-semibold transition-all border border-purple-200 disabled:opacity-50"
              title="Criar colaborador fictício para testes"
            >
              <UserPlus size={14} />
              <span>Criar Teste</span>
            </button>
          ) : (
            <button
              onClick={handleRemoveTestData}
              disabled={isLoading}
              className="flex items-center gap-1.5 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-semibold transition-all border border-red-200 disabled:opacity-50"
              title="Remover colaborador e dados de teste"
            >
              <Trash2 size={14} />
              <span>Remover Teste</span>
            </button>
          )}
        </div>

        {/* Message Toast */}
        {message && (
          <div className={`fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-50 ${
            message.includes('Erro') ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            {message}
          </div>
        )}
      </div>
    </header>
  );
}
