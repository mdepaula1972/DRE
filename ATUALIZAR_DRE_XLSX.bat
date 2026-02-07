@echo off
echo ===================================================
echo   PROCESSAMENTO DRE: Excel/CSV -> CSV Tratado
echo ===================================================
echo.
echo Verificando ambiente Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Python nao encontrado no PATH.
    pause
    exit /b
)

echo Executando process_excel_dre.py...
python process_excel_dre.py
echo.
echo ===================================================
if %errorlevel% neq 0 (
    echo [ERRO] Ocorreu um problema no processamento.
    pause
) else (
    echo Concluido com sucesso!
    echo O arquivo 'dados_tratado_jun25_em_diante.csv' foi atualizado.
    timeout /t 5
)
