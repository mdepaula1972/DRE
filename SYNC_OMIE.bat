@echo off
title Mar Brasil - Sync Omie DRE
echo ===================================================
echo   SYNC OMIE DRE - Mar Brasil
echo ===================================================
echo.

:: Verificar Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Python nao encontrado no PATH.
    echo Instale o Python 3.10+ e adicione ao PATH.
    goto error
)

:: Verificar dependencias
echo Verificando dependencias...
python -c "import playwright, pandas, dotenv, supabase" 2>nul
if %errorlevel% neq 0 (
    echo [AVISO] Instalando dependencias necessarias...
    pip install playwright pandas python-dotenv supabase openpyxl numpy
    python -m playwright install chromium
    echo.
)

:: Verificar .env
if not exist ".env" (
    echo [ERRO] Arquivo .env nao encontrado!
    echo Crie o .env com as credenciais do Omie e Supabase.
    goto error
)

echo.
echo Iniciando sincronizacao...
echo.

:: Executar script principal
python sync_omie_dre.py %*

if %errorlevel% neq 0 (
    goto error
)

echo.
echo ===================================================
echo Sincronizacao concluida com sucesso!
echo ===================================================
echo.
timeout /t 5
exit

:error
echo.
echo ===================================================
echo FALHA na sincronizacao. Verifique as mensagens acima.
echo Se houver erro de seletor, execute:
echo   python sync_omie_dre.py --debug
echo para ver o navegador e identificar o problema.
echo ===================================================
echo.
pause
exit
