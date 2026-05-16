#!/usr/bin/env python3
"""
Servidor HTTP simples para o app DRE Mar Brasil
Execute este arquivo para rodar o app localmente
"""

import http.server
import socketserver
import webbrowser
import os

import sys

# Porta padrão é 8000, mas aceita argumento via terminal (ex: python server.py 8001)
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Adiciona headers para permitir CORS se necessário
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def main():
    # Muda para o diretório do script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    Handler = MyHTTPRequestHandler
    
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            url = f"http://localhost:{PORT}"
            print("=" * 60)
            print(f"🚀 Servidor DRE Mar Brasil v27.0 iniciado!")
            print(f"📍 Acesse: {url}")
            print(f"🛑 MANTENHA ESTA JANELA ABERTA!")
            print("=" * 60)
            
            # Abre o navegador automaticamente
            webbrowser.open(url)
            
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\n\n✅ Servidor encerrado com sucesso!")
    except OSError as e:
        if e.errno == 98 or e.errno == 10048:
            print(f"❌ ERRO: A porta {PORT} ja esta em uso.")
            print(f"Tente fechar outras janelas pretas abertas ou reinicie o computador.")
        else:
            print(f"❌ ERRO AO INICIAR SERVIDOR: {e}")
        input("\nPressione ENTER para fechar...")

if __name__ == "__main__":
    main()
