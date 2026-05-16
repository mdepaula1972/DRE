"use client";

import { useState, useEffect } from "react";
import { X, UserRound, MapPin, GraduationCap, Loader2, Save, Upload, PenBox, CheckCircle2, Files, FileText, Trash2, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Employee } from "@/types/loans";
import { PeopleService } from "@/services/people.service";
import { useDataMode } from "@/contexts/DataModeContext";

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId?: string; // Se undef, é modo Criação
  onDataChanged?: () => void;
}

export function ProfileDrawer({ isOpen, onClose, employeeId, onDataChanged }: ProfileDrawerProps) {
  const { isTestMode } = useDataMode();
  
  const [profile, setProfile] = useState<Partial<Employee>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Abas: 'pessoal', 'endereco', 'complementar'
  const [activeTab, setActiveTab] = useState<'pessoal' | 'endereco' | 'complementar'>('pessoal');
  const [isEditMode, setIsEditMode] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (employeeId) {
        setIsEditMode(false);
        fetchProfile(employeeId);
      } else {
        // Modo criação
        setProfile({
          company: 'MarBR',
          linkType: 'CLT',
          status: 'Ativo',
          remuneration: 0
        });
        setIsEditMode(true);
      }
      setActiveTab('pessoal');
    } else {
      // Limpar estado qnd fecha
      setProfile({});
      setError(null);
    }
  }, [isOpen, employeeId, isTestMode]);

  const fetchProfile = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [data, hist] = await Promise.all([
        PeopleService.getEmployeeProfile(id, isTestMode),
        PeopleService.getEmployeeHistory(id, isTestMode)
      ]);
      setProfile(data || {});
      setHistory(hist || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar Ficha RH');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      if (!profile.name || !profile.company) {
        throw new Error('Nome e Empresa são obrigatórios.');
      }
      
      const saved = await PeopleService.saveEmployeeProfile(profile, isTestMode);
      
      // Se era criação (sem id), vamos definir o ID agora
      if (!profile.id && saved.id) {
        setProfile({ ...profile, id: saved.id });
      }
      
      setIsEditMode(false);
      if (onDataChanged) onDataChanged();
      
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar os dados.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof Employee, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile.id) return;
    
    setIsSaving(true);
    try {
      const url = await PeopleService.uploadProfilePhoto(profile.id, file, isTestMode);
      handleChange('photo_url', url);
      // Se não der erro, salva o resto tbm pra persistir a URL
      await PeopleService.saveEmployeeProfile({ ...profile, photo_url: url }, isTestMode);
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
       setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdditiveUpload = async (e: React.ChangeEvent<HTMLInputElement>, historyId?: string) => {
    const file = e.target.files?.[0];
    if (!file || !profile.id) return;
    
    setIsSaving(true);
    try {
      const url = await PeopleService.uploadAdditiveFile(profile.id, file, isTestMode);
      const dateStr = new Date().toLocaleDateString('pt-BR');
      const markdownLink = `[Anexo ${dateStr}](${url})`;

      if (historyId) {
        // Vincula a um item específico do histórico
        const item = history.find(h => h.id === historyId);
        const newObs = (item?.observations || '') + (item?.observations ? '\n' : '') + markdownLink;
        await PeopleService.updateHistoryItem(historyId, { observations: newObs }, isTestMode);
        // Atualiza localmente
        setHistory(prev => prev.map(h => h.id === historyId ? { ...h, observations: newObs } : h));
      } else {
        // Vincula ao campo geral de aditivos do perfil
        const currentText = profile.links_aditivos ? profile.links_aditivos + '\n' : '';
        const newText = currentText + markdownLink;
        handleChange('links_aditivos', newText);
        await PeopleService.saveEmployeeProfile({ ...profile, links_aditivos: newText }, isTestMode);
      }
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
       setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBaseContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile.id) return;
    
    setIsSaving(true);
    try {
      const url = await PeopleService.uploadAdditiveFile(profile.id, file, isTestMode);
      const currentText = profile.links_contratos ? profile.links_contratos + '\n' : '';
      const newText = currentText + `[Documento Base ${new Date().toLocaleDateString('pt-BR')}](${url})`;
      
      handleChange('links_contratos', newText);
      await PeopleService.saveEmployeeProfile({ ...profile, links_contratos: newText }, isTestMode);
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
       setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLink = async (field: 'links_aditivos' | 'links_contratos', linkToRemove: string) => {
    if (!confirm('Deseja realmente remover este anexo?')) return;
    
    const currentText = profile[field] || '';
    const newText = currentText.split('\n').filter(line => !line.includes(linkToRemove)).join('\n');
    
    setIsSaving(true);
    try {
      handleChange(field, newText);
      await PeopleService.saveEmployeeProfile({ ...profile, [field]: newText }, isTestMode);
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper ui classes
  const inputClass = `w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none transition-all ${isEditMode ? 'focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500' : 'bg-transparent border-transparent px-0 font-medium'}`;
  const labelClass = "text-[10px] font-bold text-slate-500 uppercase mb-1 block";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          // Alinhado à ESQUERDA (left-0), sombra para a DIREITA (shadow-[20px_...])
          className="fixed left-0 top-0 h-full w-full max-w-xl bg-white dark:bg-slate-950 shadow-[20px_0_40px_rgba(0,0,0,0.1)] z-50 flex flex-col"
        >
          {/* Menu Fixo Topo */}
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <UserRound size={20} />
               </div>
               <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {employeeId ? 'Ficha do Colaborador' : 'Novo Colaborador'}
                  </h2>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Perfil Recursos Humanos</p>
               </div>
            </div>
            
            <div className="flex gap-2">
              {employeeId && !isEditMode && (
                <button 
                  onClick={() => setIsEditMode(true)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all text-slate-600"
                  title="Editar Ficha"
                >
                  <PenBox size={18} />
                </button>
              )}
              {isEditMode && (
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 p-2 px-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all text-white font-semibold text-xs"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Salvar
                </button>
              )}
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Abas */}
          <div className="flex border-b border-slate-100 px-6 shrink-0 bg-slate-50/50">
            <button 
              onClick={() => setActiveTab('pessoal')}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all ${activeTab === 'pessoal' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Info Pessoal
            </button>
            <button 
              onClick={() => setActiveTab('endereco')}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all ${activeTab === 'endereco' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Endereço
            </button>
            <button 
              onClick={() => setActiveTab('complementar')}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all ${activeTab === 'complementar' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Dados Auxiliares
            </button>
          </div>

           {/* Corpo Escrolável */}
          <div className="p-6 overflow-y-auto flex-1">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : (
               <div className="space-y-6">
                 {error && (
                   <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-200">
                     <X size={16} /> {error}
                   </div>
                 )}

                 {/* ------------- ABA PESSOAL ------------- */}
                 {activeTab === 'pessoal' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                      
                      {/* Avatar & Header */}
                      <div className="flex items-start gap-4">
                        <div className="relative group">
                          <img 
                            src={profile.photo_url || profile.avatar || "https://ui-avatars.com/api/?name=" + (profile.name || "Colab") + "&background=random"} 
                            alt="Avatar" 
                            className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-sm"
                          />
                          {isEditMode && profile.id && (
                            <label className="absolute inset-0 bg-black/50 text-white rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                              <Upload size={18} className="mb-1" />
                              <span className="text-[10px] font-bold">Trocar</span>
                              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                            </label>
                          )}
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div>
                            <label className={labelClass}>Nome Completo</label>
                            <input 
                              type="text" 
                              value={profile.name || ''} 
                              onChange={e => handleChange('name', e.target.value)} 
                              readOnly={!isEditMode}
                              className={`text-lg font-bold w-full outline-none bg-transparent ${isEditMode ? 'border-b border-slate-300 border-dashed focus:border-blue-500' : ''}`}
                              placeholder="Maria José..."
                            />
                          </div>
                          <div className="flex gap-4">
                             <div className="flex-1">
                              <label className={labelClass}>Vínculo</label>
                              {isEditMode ? (
                                <select value={profile.linkType || 'CLT'} onChange={e => handleChange('linkType', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-1.5 px-2">
                                  <option value="CLT">CLT</option>
                                  <option value="PJ">PJ</option>
                                  <option value="Estagiário">Estagiário</option>
                                </select>
                              ) : (
                                <span className="text-sm font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-700">{profile.linkType || '-'}</span>
                              )}
                             </div>
                             <div className="flex-1">
                              <label className={labelClass}>Empresa</label>
                               {isEditMode ? (
                                <select value={profile.company || 'MarBR'} onChange={e => handleChange('company', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-1.5 px-2">
                                  <option value="MarBR">MarBR</option>
                                  <option value="DZM">DZM</option>
                                </select>
                              ) : (
                                <span className="text-sm font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-700">{profile.company || '-'}</span>
                              )}
                             </div>
                          </div>
                        </div>
                      </div>

                      {/* Fields */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                        <div>
                          <label className={labelClass}>CPF / CNPJ</label>
                          <input type="text" value={profile.document_id || ''} onChange={e => handleChange('document_id', e.target.value)} readOnly={!isEditMode} className={inputClass} placeholder="000.000.000-00"/>
                        </div>
                        <div>
                          <label className={labelClass}>Remuneração Bruta</label>
                          <input type="number" step="0.01" value={profile.remuneration || ''} onChange={e => handleChange('remuneration', parseFloat(e.target.value))} readOnly={!isEditMode} className={inputClass} placeholder="5000.00"/>
                        </div>

                        <div>
                          <label className={labelClass}>Setor</label>
                          <input type="text" value={profile.department || ''} onChange={e => handleChange('department', e.target.value)} readOnly={!isEditMode} className={inputClass}/>
                        </div>
                        <div>
                          <label className={labelClass}>Função / Cargo</label>
                          <input type="text" value={profile.job_role || ''} onChange={e => handleChange('job_role', e.target.value)} readOnly={!isEditMode} className={inputClass}/>
                        </div>

                        <div>
                          <label className={labelClass}>E-mail Pessoal</label>
                          <input type="email" value={profile.email || ''} onChange={e => handleChange('email', e.target.value)} readOnly={!isEditMode} className={inputClass} placeholder="usuario@gmail.com"/>
                        </div>
                        <div>
                          <label className={labelClass}>Telefone Pessoal</label>
                          <input type="text" value={profile.phone || ''} onChange={e => handleChange('phone', e.target.value)} readOnly={!isEditMode} className={inputClass}/>
                        </div>

                         <div>
                          <label className={labelClass}>Chave PIX</label>
                          <input type="text" value={profile.pix_key || ''} onChange={e => handleChange('pix_key', e.target.value)} readOnly={!isEditMode} className={inputClass}/>
                        </div>
                        <div>
                          <label className={labelClass}>Vencimento Contrato/Aditivo</label>
                          <input type="date" value={profile.contract_expiry_date || ''} onChange={e => handleChange('contract_expiry_date', e.target.value)} readOnly={!isEditMode} className={inputClass}/>
                        </div>
                        
                        <div className="col-span-2 mt-4">
                           <div className="flex justify-between items-center mb-2">
                              <h4 className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                <Files size={12} /> Contratos e Documentos Base
                              </h4>
                              {profile.id && (
                                <label className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded cursor-pointer hover:bg-emerald-100 transition-all flex items-center gap-1">
                                  <Upload size={12} /> Anexar Documento
                                  <input type="file" className="hidden" onChange={handleBaseContractUpload} />
                                </label>
                              )}
                           </div>
                           <div className="space-y-2">
                              {profile.links_contratos?.split('\n').filter(l => l.trim()).map((line, idx) => {
                                const urlMatch = line.match(/\((.*?)\)/);
                                const labelMatch = line.match(/\[(.*?)\]/);
                                const url = urlMatch ? urlMatch[1] : null;
                                const label = labelMatch ? labelMatch[1] : line;
                                
                                return (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-lg group">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                      <FileText size={14} className="text-blue-500 shrink-0" />
                                      {url ? (
                                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 hover:underline truncate">
                                          {label}
                                        </a>
                                      ) : (
                                        <span className="text-xs text-slate-600 truncate">{line}</span>
                                      )}
                                    </div>
                                    <button onClick={() => handleDeleteLink('links_contratos', line)} className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                );
                              })}
                              {!profile.links_contratos && <p className="text-[10px] text-slate-400 italic">Nenhum documento anexado.</p>}
                           </div>
                        </div>

                        <div>
                          <label className={labelClass}>Status</label>
                           {isEditMode ? (
                                <select value={profile.status || 'Ativo'} onChange={e => handleChange('status', e.target.value as any)} className={inputClass}>
                                  <option value="Ativo">Ativo</option>
                                  <option value="Férias">Férias</option>
                                  <option value="Inativo">Inativo</option>
                                </select>
                           ) : (
                                <div className="text-sm font-semibold flex items-center gap-2 mt-2">
                                  {profile.status === 'Ativo' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <X size={16} className="text-red-500" />} 
                                  {profile.status}
                                </div>
                           )}
                        </div>

                        <div className="col-span-2 md:col-span-1">
                          <label className={labelClass}>Função / Cargo</label>
                          <input type="text" value={profile.job_role || ''} onChange={e => handleChange('job_role', e.target.value)} readOnly={!isEditMode} className={inputClass} placeholder="Ex: Analista Financeiro" />
                        </div>

                        <div className="col-span-2 md:col-span-1">
                          <label className={labelClass}>Departamento</label>
                          <input type="text" value={profile.department || ''} onChange={e => handleChange('department', e.target.value)} readOnly={!isEditMode} className={inputClass} placeholder="Ex: Administrativo" />
                        </div>
                      </div>
                    </motion.div>
                 )}

                 {/* ------------- ABA ENDERECO ------------- */}
                 {activeTab === 'endereco' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                      <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-12 md:col-span-4">
                           <label className={labelClass}>CEP</label>
                           <input type="text" value={profile.zip_code || ''} onChange={e => handleChange('zip_code', e.target.value)} readOnly={!isEditMode} className={inputClass}/>
                        </div>
                        <div className="col-span-12 md:col-span-8">
                           <label className={labelClass}>Logradouro</label>
                           <input type="text" value={profile.street || ''} onChange={e => handleChange('street', e.target.value)} readOnly={!isEditMode} className={inputClass}/>
                        </div>
                        
                        <div className="col-span-4">
                           <label className={labelClass}>Número</label>
                           <input type="text" value={profile.number || ''} onChange={e => handleChange('number', e.target.value)} readOnly={!isEditMode} className={inputClass}/>
                        </div>
                        <div className="col-span-8">
                           <label className={labelClass}>Complemento</label>
                           <input type="text" value={profile.complement || ''} onChange={e => handleChange('complement', e.target.value)} readOnly={!isEditMode} className={inputClass}/>
                        </div>

                        <div className="col-span-12 md:col-span-6">
                           <label className={labelClass}>Bairro</label>
                           <input type="text" value={profile.neighborhood || ''} onChange={e => handleChange('neighborhood', e.target.value)} readOnly={!isEditMode} className={inputClass}/>
                        </div>
                        <div className="col-span-9 md:col-span-4">
                           <label className={labelClass}>Cidade</label>
                           <input type="text" value={profile.city || ''} onChange={e => handleChange('city', e.target.value)} readOnly={!isEditMode} className={inputClass}/>
                        </div>
                        <div className="col-span-3 md:col-span-2">
                           <label className={labelClass}>UF</label>
                           <input type="text" value={profile.state || ''} onChange={e => handleChange('state', e.target.value)} readOnly={!isEditMode} className={inputClass}/>
                        </div>
                      </div>
                    </motion.div>
                 )}

                 {/* ------------- ABA COMPLEMENTAR ------------- */}
                 {activeTab === 'complementar' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                      
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 border-b pb-2 mb-4 flex items-center gap-2"><MapPin size={14}/> Contato de Emergência</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelClass}>Nome</label>
                            <input type="text" value={profile.emergency_contact_name || ''} onChange={e => handleChange('emergency_contact_name', e.target.value)} readOnly={!isEditMode} className={inputClass}/>
                          </div>
                          <div>
                            <label className={labelClass}>Telefone</label>
                            <input type="text" value={profile.emergency_contact_phone || ''} onChange={e => handleChange('emergency_contact_phone', e.target.value)} readOnly={!isEditMode} className={inputClass}/>
                          </div>
                        </div>
                      </div>

                      {/* PJ Data (if applicable) */}
                      {profile.linkType === 'PJ' && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 border-b pb-2 mb-4">Dados da Empresa (PJ)</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                              <label className={labelClass}>Razão Social</label>
                              <input type="text" value={profile.corporate_name || ''} onChange={e => handleChange('corporate_name', e.target.value)} readOnly={!isEditMode} className={inputClass}/>
                            </div>
                            <div>
                              <label className={labelClass}>Representante Legal</label>
                              <input type="text" value={profile.responsible_name || ''} onChange={e => handleChange('responsible_name', e.target.value)} readOnly={!isEditMode} className={inputClass}/>
                            </div>
                            <div>
                              <label className={labelClass}>CPF do Responsável</label>
                              <input type="text" value={profile.responsible_cpf || ''} onChange={e => handleChange('responsible_cpf', e.target.value)} readOnly={!isEditMode} className={inputClass}/>
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="text-xs font-bold text-slate-900 border-b pb-2 mb-4 flex items-center gap-2"><GraduationCap size={14}/> Background Institucional</h4>
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className={labelClass}>Histórico de Formação (Grau / Curso / Instituição)</label>
                            <textarea 
                              value={profile.education_data && Array.isArray(profile.education_data) 
                                ? profile.education_data.map(e => `${e.level} em ${e.area}`).join('\n') 
                                : typeof profile.education_data === 'string' 
                                  ? profile.education_data 
                                  : ''} 
                              onChange={e => handleChange('education_data', e.target.value)} 
                              readOnly={!isEditMode} 
                              className={`${inputClass} min-h-[60px] resize-y`}
                              placeholder="Tecnólogo em Análise de Sistemas - Fatec..."
                            />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase block">Meus Aditivos (Links ou Observações)</label>
                              {profile.id && (
                                <label className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded cursor-pointer hover:bg-emerald-100 flex items-center gap-1 transition-all">
                                  <Upload size={12} />
                                  Anexar Arquivo
                                  <input type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.png" onChange={handleAdditiveUpload} />
                                </label>
                              )}
                            </div>
                            <textarea 
                              value={profile.links_aditivos || ''} 
                              onChange={e => handleChange('links_aditivos', e.target.value)} 
                              readOnly={!isEditMode} 
                              className={`${inputClass} min-h-[60px] resize-y`}
                              placeholder="Insira os links para os PDFs de aditivos ou clique em Anexar Arquivo..."
                            />
                          </div>
                        </div>
                      </div>

                      {/* Histórico de Aditivos (Legacy) */}
                      {(() => {
                        const filteredHistory = history.filter(h => 
                          h.event_type?.toLowerCase().includes('aditivo') || 
                          h.event_type?.toLowerCase().includes('novo empréstimo') ||
                          h.event_type?.toLowerCase().includes('empréstimo')
                        ).filter(h => !h.observations?.toLowerCase().includes('parcela'));

                        if (filteredHistory.length === 0) return null;

                        return (
                          <div className="mt-8">
                            <h4 className="text-xs font-bold text-slate-900 border-b pb-2 mb-4 flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-blue-500" /> Histórico de Aditivos & Movimentações
                            </h4>
                            <div className="space-y-3">
                              {filteredHistory.map((h, i) => {
                                const urlMatch = h.observations?.match(/\((https?:\/\/.*?)\)/);
                                const observationText = h.observations?.replace(/\[(.*?)\]\(.*?\)/g, '').trim();

                                return (
                                  <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-xl relative group">
                                    <div className="flex justify-between items-start mb-1">
                                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded leading-none">
                                        {h.event_type}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        {profile.id && (
                                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <label className="p-1 px-2 bg-white border border-slate-200 rounded text-[9px] font-bold text-emerald-600 cursor-pointer hover:bg-emerald-50">
                                              <Upload size={10} /> Anexar
                                              <input type="file" className="hidden" onChange={(e) => handleAdditiveUpload(e, h.id)} />
                                            </label>
                                            <button 
                                              onClick={async () => {
                                                if (confirm('Deseja excluir este registro do histórico?')) {
                                                  try {
                                                    await PeopleService.deleteHistoryItem(h.id, isTestMode);
                                                    setHistory(prev => prev.filter(item => item.id !== h.id));
                                                    if (onDataChanged) onDataChanged();
                                                  } catch (err: any) {
                                                    alert(err.message);
                                                  }
                                                }
                                              }}
                                              className="p-1 px-2 bg-white border border-slate-200 rounded text-red-500 hover:bg-red-50"
                                              title="Excluir Registro"
                                            >
                                              <Trash2 size={10} />
                                            </button>
                                          </div>
                                        )}
                                        <span className="text-[10px] font-bold text-slate-400">
                                          {new Date(h.change_date).toLocaleDateString('pt-BR')}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-xs text-slate-600 leading-relaxed italic flex-1">
                                        {observationText || 'Registro de sistema.'}
                                      </p>
                                      {urlMatch && (
                                        <a href={urlMatch[1]} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 hover:bg-blue-200 transition-all">
                                           <ExternalLink size={12} /> Ver Arquivo
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                    </motion.div>
                 )}
               </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
