@echo off
title Mar Brasil - Atualizador de Dados DRE
echo ===================================================
echo   ATUALIZADOR DE DRE - Mar Brasil
echo ===================================================
echo.
echo Este script ira unir os arquivos:
echo 1. dados_mai25.csv (Historico)
echo 2. dados_tratado_jun25_em_diante.csv (Novos Dados)
echo.
echo Verificando arquivos...

if not exist "dados_mai25.csv" (
    echo [ERRO] Arquivo 'dados_mai25.csv' nao encontrado!
    goto error
)

if not exist "dados_tratado_jun25_em_diante.csv" (
    echo [ERRO] Arquivo 'dados_tratado_jun25_em_diante.csv' nao encontrado!
    goto error
)

echo [OK] Arquivos encontrados. Iniciando processamento...
echo.

node import-dre-dual-source.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] Ocorreu um problema ao processar os dados.
    goto error
)

echo.
echo ===================================================
echo ✅ SUCESSO! Os dados foram atualizados.
echo Agora voce pode abrir o Dashboard para ver as mudancas.
echo ===================================================
echo.
pause
exit

:error
echo.
echo ===================================================
echo ❌ FALHA na atualizacao. Verifique as mensagens acima.
echo ===================================================
echo.
pause
exit
