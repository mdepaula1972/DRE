import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import Papa from "papaparse";
import { slugify } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new NextResponse("Nenhum arquivo enviado", { status: 400 });
    }

    const text = await file.text();
    
    const results = await new Promise<any[]>((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (error: Error) => reject(error),
      });
    });

    if (!results || results.length === 0) {
      return new NextResponse("Arquivo vazio", { status: 400 });
    }

    // Processar e preparar dados para o Supabase (Tabela employees)
    const empsToCreate = results
      .filter((row: any) => row.razaoSocial || row.full_name) // Aceita tanto o cabeçalho do CSV quanto o campo do banco
      .map((row: any) => {
        // Mapeamento de campos do CSV para a tabela 'employees'
        const fullName = row.full_name || row.razaoSocial; 
        
        return {
          full_name: fullName,
          company: row.company || row.empresa || 'MarBR',
          employment_type: row.employment_type || row.tipo || 'CLT',
          remuneration: row.remuneration || row.salario || 0,
          status: 'Ativo',
          job_role: row.job_role || row.cargo || 'Não definido',
          links_aditivos: row.links_aditivos || ''
        };
      });

    if (empsToCreate.length === 0) {
      return new NextResponse("Nenhum dado válido encontrado no arquivo.", { status: 400 });
    }

    // Inserção no Supabase
    const { data, error } = await supabase
      .from('employees')
      .insert(empsToCreate)
      .select();

    if (error) {
      console.error("[SUPABASE_INSERT_ERROR]", error);
      return new NextResponse(`Erro ao salvar no banco: ${error.message}`, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      message: `${data?.length || 0} registros importados com sucesso`
    });

  } catch (error) {
    console.error("[IMPORT_ERROR]", error);
    return new NextResponse("Erro interno ao processar arquivo", { status: 500 });
  }
}
