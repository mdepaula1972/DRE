@echo off
chcp 65001 >nul
TITLE Mar Brasil - Auditoria (Porta 8001)
COLOR 0B

cd /d "%~dp0"

echo ========================================================
echo      MAR BRASIL - MODO AUDITORIA (PORTA 8001)
echo ========================================================
echo.

python server.py 8001

if %ERRORLEVEL% NEQ 0 (
    echo [!] Erro ao iniciar com Python. Tentando Node.js...
    call npx -y http-server -p 8001 -c-1
)

pause
