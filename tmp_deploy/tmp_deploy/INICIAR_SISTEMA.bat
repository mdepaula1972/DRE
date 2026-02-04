@echo off
chcp 65001 >nul
TITLE Mar Brasil v27.0
COLOR 0E

:: Entra no diretório do arquivo .bat
cd /d "%~dp0"

echo ========================================================
echo      MAR BRASIL v27.0 - INICIANDO SISTEMA
echo ========================================================
echo.

:: 1. Verifica se Python existe
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] Python nao encontrado no PATH. Tentando Node.js...
    goto TRY_NODE
)

echo [OK] Motor de carregamento (Python) encontrado.
echo Iniciando servidor... 
echo.
python server.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [AVISO] O servidor Python retornou erro: %ERRORLEVEL%
)
goto END

:TRY_NODE
:: 2. Tenta Node.js
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] Node.js nao encontrado.
    goto FAIL
)

echo [OK] Motor secundario (Node.js) encontrado.
echo Iniciando servidor...
call npx -y http-server -p 8000 -c-1
goto END

:FAIL
:: 3. Abrir arquivo direto
echo [!] Motores de sistema nao encontrados. 
echo Abrindo em modo de compatibilidade direta...
echo.
start "" "index.html"
goto END

:END
echo.
echo ========================================================
echo Janela de seguranca. Pressione uma tecla para fechar.
pause
