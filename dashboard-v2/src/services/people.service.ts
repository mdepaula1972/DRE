import { supabase } from '@/lib/supabase';
import { Employee, ChildData, EducationData } from '@/types/loans';

export class PeopleService {
  /**
   * Busca os dados completos de um colaborador pelo ID,
   * trazendo todos os campos sensíveis e de RH.
   */
  static async getEmployeeProfile(employeeId: string, isTestMode?: boolean): Promise<Partial<Employee> | null> {
    const table = isTestMode ? 'employees_test' : 'employees';
    
    const { data: raw, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', employeeId)
      .single();

    if (error) {
      console.error(`[PeopleService] Erro ao buscar perfil RH do colaborador:`, error);
      return null;
    }

    if (!raw) return null;

    return this.mapRawToProfile(raw);
  }

  /**
   * Busca o histórico de alterações (Aditivos) do colaborador.
   */
  static async getEmployeeHistory(employeeId: string, isTestMode?: boolean): Promise<any[]> {
    const table = isTestMode ? 'employee_history_test' : 'employee_history';
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('employee_id', employeeId)
      .order('change_date', { ascending: false });

    if (error) {
      if (isTestMode && error.code === '42P01') return [];
      console.error(`[PeopleService] Erro ao buscar histórico:`, error);
      return [];
    }
    return data || [];
  }

  /**
   * Atualiza um item do histórico (ex: para adicionar anexo).
   */
  static async updateHistoryItem(id: string, updates: any, isTestMode?: boolean): Promise<void> {
    const table = isTestMode ? 'employee_history_test' : 'employee_history';
    const { error } = await supabase.from(table).update(updates).eq('id', id);
    if (error) throw new Error(`Falha ao atualizar histórico: ${error.message}`);
  }

  static async deleteHistoryItem(id: string, isTestMode?: boolean): Promise<void> {
    const table = isTestMode ? 'employee_history_test' : 'employee_history';
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw new Error(`Falha ao excluir histórico: ${error.message}`);
  }

  /**
   * Salva ou Atualiza um Colaborador no banco de dados.
   */
  static async saveEmployeeProfile(payload: Partial<Employee>, isTestMode?: boolean): Promise<any> {
    const table = isTestMode ? 'employees_test' : 'employees';
    
    // Mapeamento inverso para as colunas do DB
    const dbPayload = this.mapProfileToRaw(payload);
    
    const { id, ...updateData } = dbPayload;

    if (id) {
      // UPDATE
      const { data, error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw new Error(`Falha ao atualizar colaborador: ${error.message}`);
      return data;
    } else {
      // INSERT
      const { data, error } = await supabase
        .from(table)
        .insert([updateData])
        .select()
        .single();
      
      if (error) throw new Error(`Falha ao registrar novo colaborador: ${error.message}`);
      return data;
    }
  }

  /**
   * Salva o upload de um arquivo para o Storage (ex: foto de perfil)
   */
  static async uploadProfilePhoto(employeeId: string, file: File, isTestMode?: boolean): Promise<string> {
    const folder = isTestMode ? 'test' : 'production';
    const ext = file.name.split('.').pop() || 'jpg';
    const storagePath = `profiles/${folder}/${employeeId}.${ext}`;

    // Remove versão anterior
    await supabase.storage.from('avatars').remove([storagePath]);

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(storagePath, file, { upsert: true, contentType: file.type });

    if (uploadError) throw new Error(`Falha no upload da foto: ${uploadError.message}`);

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(storagePath);
    
    return publicUrl;
  }

  /**
   * Salva o upload de um Aditivo/Contrato do RH para o Storage (bucket contracts)
   */
  static async uploadAdditiveFile(employeeId: string, file: File, isTestMode?: boolean): Promise<string> {
    const folder = isTestMode ? 'test' : 'production';
    const ext = file.name.split('.').pop() || 'pdf';
    const storagePath = `rh-aditivos/${folder}/${employeeId}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(storagePath, file, { upsert: true, contentType: file.type });

    if (uploadError) throw new Error(`Falha no upload do aditivo: ${uploadError.message}`);

    const { data } = await supabase.storage.from('contracts').createSignedUrl(storagePath, 31536000); // 1 year approx
    return data?.signedUrl || storagePath;
  }

  // --- Converters ---
  private static mapRawToProfile(raw: any): Partial<Employee> {
    const safeParseJson = (data: any) => {
      if (!data) return [];
      if (typeof data === 'string') {
        try { return JSON.parse(data); } catch { return []; }
      }
      return data;
    };

    return {
      id: raw.id,
      name: raw.full_name || raw.name,
      corporate_name: raw.corporate_name,
      responsible_name: raw.responsible_name,
      responsible_cpf: raw.responsible_cpf,
      responsible_rg: raw.responsible_rg,
      document_id: raw.document_id,
      document_rg: raw.document_rg,
      pj_type: raw.pj_type,
      linkType: (raw.employment_type || raw.link_type) as any,
      company: raw.company,
      remuneration: parseFloat(String(raw.remuneration)) || 0,
      status: raw.status || (raw.active ? 'Ativo' : 'Inativo'),
      created_at: raw.created_at,
      
      // Novos campos RH
      job_role: raw.job_role,
      department: raw.department,
      
      // Endereço
      zip_code: raw.zip_code,
      street: raw.street,
      number: raw.number,
      neighborhood: raw.neighborhood,
      city: raw.city,
      state: raw.state,
      complement: raw.complement,
      
      // Contato
      email: raw.email,
      phone: raw.phone,
      pix_key: raw.pix_key,
      emergency_contact_name: raw.emergency_contact_name,
      emergency_contact_phone: raw.emergency_contact_phone,
      
      // Dados Auxiliares
      children_data: safeParseJson(raw.children_data),
      education_data: safeParseJson(raw.education_data),
      
      photo_url: raw.photo_url || raw.avatar_url,
      contract_expiry_date: raw.contract_expiry_date || '',
      links_contratos: raw.links_contratos,
      links_aditivos: raw.links_aditivos,
      links_emprestimos: raw.links_emprestimos
    };
  }

  private static mapProfileToRaw(profile: Partial<Employee>): any {
    return {
      id: profile.id,
      full_name: profile.name,
      corporate_name: profile.corporate_name,
      responsible_name: profile.responsible_name,
      responsible_cpf: profile.responsible_cpf,
      responsible_rg: profile.responsible_rg,
      document_id: profile.document_id,
      document_rg: profile.document_rg,
      pj_type: profile.pj_type,
      employment_type: profile.linkType,
      company: profile.company,
      remuneration: profile.remuneration,
      status: profile.status,
      
      // Novos campos RH
      job_role: profile.job_role,
      department: profile.department,
      
      zip_code: profile.zip_code,
      street: profile.street,
      number: profile.number,
      neighborhood: profile.neighborhood,
      city: profile.city,
      state: profile.state,
      complement: profile.complement,
      
      email: profile.email,
      phone: profile.phone,
      pix_key: profile.pix_key,
      emergency_contact_name: profile.emergency_contact_name,
      emergency_contact_phone: profile.emergency_contact_phone,
      
      children_data: profile.children_data,
      education_data: profile.education_data,
      
      photo_url: profile.photo_url,
      contract_expiry_date: profile.contract_expiry_date,
      links_contratos: profile.links_contratos,
      links_aditivos: profile.links_aditivos,
      links_emprestimos: profile.links_emprestimos
    };
  }
}
