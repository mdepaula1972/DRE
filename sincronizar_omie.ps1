# Sincronizador Atômico Omie -> Supabase
# v29.4 - Mar Brasil / DZM

Write-Host "--- Sincronizador Omie Dashboard ---" -ForegroundColor Cyan
Write-Host "Este script irá carregar os dados financeiros para o banco de dados." -ForegroundColor Gray

$inputDate = Read-Host "`nInforme a data de início (DD/MM/AAAA) [01/06/2025]"
if ($inputDate -eq "") { $inputDate = "01/06/2025" }

Write-Host "`n[1/1] Iniciando sincronização completa a partir de $inputDate..." -ForegroundColor Yellow
python omie_supabase_ingest.py --modo registro --de $inputDate --empresa all --verbose --persist-supabase --include-movimentos-saida

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[OK] Sincronização concluída com sucesso!" -ForegroundColor Green
} else {
    Write-Host "`n[!] Ocorreu um erro durante a sincronização. Verifique os logs acima." -ForegroundColor Red
}

Write-Host "`nPressione qualquer tecla para sair..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
