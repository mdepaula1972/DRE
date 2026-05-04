import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { month, year, company } = await req.json();

    if (!month || !year) {
      return NextResponse.json({ status: 'error', message: 'M s e Ano s o obrigat rios.' }, { status: 400 });
    }

    const scriptPath = path.join(process.cwd(), '..', 'sync_period.py');
    const args = ['--month', month, '--year', year];
    if (company) {
      args.push('--company', company);
    }

    // Usando spawn para streaming de output com modo -u (unbuffered)
    const pythonProcess = spawn('python', ['-u', scriptPath, ...args]);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        pythonProcess.stdout.on('data', (data) => {
          const lines = data.toString().split('\n');
          for (const line of lines) {
            if (line.startsWith('PROGRESS:')) {
              controller.enqueue(encoder.encode(`data: ${line}\n\n`));
            }
          }
        });

        pythonProcess.stderr.on('data', (data) => {
          console.error(`Script Error: ${data}`);
        });

        pythonProcess.on('close', (code) => {
          controller.enqueue(encoder.encode(`data: DONE\n\n`));
          controller.close();
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
