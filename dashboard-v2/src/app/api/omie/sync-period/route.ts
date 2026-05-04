import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { month, year } = await req.json();

    if (!month || !year) {
      return NextResponse.json({ status: 'error', message: 'M s e Ano s o obrigat rios.' }, { status: 400 });
    }

    // O script python est  na raiz do projeto (D:\DRE-V29 - Novo DRE)
    // O Next.js roda em dashboard-v2
    const scriptPath = path.join(process.cwd(), '..', 'sync_period.py');
    
    // Comando para rodar o script
    const command = `python "${scriptPath}" --month ${month} --year ${year}`;

    console.log(`Executando Auditoria: ${command}`);

    return new Promise<NextResponse>((resolve) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Erro no script: ${error.message}`);
          resolve(NextResponse.json({ 
            status: 'error', 
            message: 'Erro ao executar sincroniza  o de auditoria.',
            details: stderr 
          }, { status: 500 }));
          return;
        }
        
        console.log(`Stdout: ${stdout}`);
        resolve(NextResponse.json({ 
          status: 'success', 
          message: `Auditoria de ${month}/${year} conclu da com sucesso!`,
          log: stdout 
        }));
      });
    });

  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
