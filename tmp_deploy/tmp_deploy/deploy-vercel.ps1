# Script de Automação de Deploy para Mar Brasil
# Este script faz o deploy direto para a produção na Vercel

Write-Host "--- Iniciando Deploy para Vercel ---" -ForegroundColor Cyan

# Verifica se o comando vercel está disponível
if (!(Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "Erro: Vercel CLI não encontrado. Por favor, instale com 'npm install -g vercel'." -ForegroundColor Red
    exit
}

# Executa o deploy
# --prod: Envia direto para produção
# --yes: Pula confirmações interativas
# --token: Opcional (se não estiver logado, mas recomenda-se rodar 'vercel login' uma vez na máquina)
vercel deploy --prod --yes

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deploy concluído com sucesso em $(Get-Date)!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro durante o deploy." -ForegroundColor Red
}

# Mantenha o console aberto se rodar manualmente
# Read-Host "Pressione qualquer tecla para sair..."
