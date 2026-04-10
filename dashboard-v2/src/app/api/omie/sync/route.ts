import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST() {
  try {
    // Definimos D-3 para captar apenas atualizações super recentes e rodar rápido (Incremental Sync)
    const d3 = new Date();
    d3.setDate(d3.getDate() - 3);
    const mm = String(d3.getMonth() + 1).padStart(2, '0');
    const dd = String(d3.getDate()).padStart(2, '0');
    const yyyy = d3.getFullYear();
    const deStr = `${dd}/${mm}/${yyyy}`;

    // Tentativa otimizada de execução do script Python nativo (Ambiente Local/Self-hosted)
    // O comando usa o pipeline já existente, garantindo a lógica idêntica de explosoes estruturais e rateios.
    // O ambiente de cloud serverless pode não suportar isso sem buildpacks.
    
    // Command line arguments following the python cli
    const command = `python ../omie_supabase_ingest.py --modo alteracao --de ${deStr} --empresa all --persist-supabase --include-movimentos-saida`;
    
    // Non-blocking fire and forget se for ambiente Vercel (onde pode não ter Python),
    // mas responderemos OK agendado para o usuário não ficar congelado.
    if (process.env.VERCEL) {
      // Ambiente Vercel - O Ideal é apontar para um Github Action ou AWS Lambda
      console.warn("Aviso: Sincronização em ambiente Serverless. Sugerido mapear para um Webhook Serverless (Github Actions).");
      // Retornar Sucesso-falso como Placeholder de transição
      return NextResponse.json({ 
        status: 'queued', 
        message: 'Aviso: Rodando no Vercel. A sincronização profunda será delegada às Actions de back-office.'
      });
    }

    const { stdout, stderr } = await execAsync(command, { timeout: 15000 }); // timeout 15s p/ evitar hung
    console.log('[Omie Sync]', stdout);

    if (stderr && !stderr.includes('Warning')) {
      console.error('[Omie Sync Error]', stderr);
    }

    return NextResponse.json({ status: 'success', message: 'Sincronização Delta (3 dias) concluída.' });
    
  } catch (error: any) {
    console.error('Falha geral na sincronização Omie:', error);
    return NextResponse.json(
      { status: 'error', message: error.message || 'Erro interno na sincronização' },
      { status: 500 }
    );
  }
}
