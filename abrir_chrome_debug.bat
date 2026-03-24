@echo off
REM ============================================================
REM Abre o Chrome em modo debug para automação Playwright
REM ============================================================

echo.
echo ========================================
echo   CHROME EM MODO DEBUG
echo ========================================
echo.
echo O Chrome vai abrir com porta de depuracao ativa.
echo Voce pode usar normalmente para navegar e fazer login.
echo.
echo Quando quiser rodar a automacao, deixe o Chrome aberto
echo e execute: python validar_lancamentos_omie.py
echo.
echo Pressione qualquer tecla para continuar...
pause >nul

REM Criar pasta temporaria para perfil de debug
set DEBUG_DIR=%TEMP%\chrome-debug-omie

if not exist "%DEBUG_DIR%" mkdir "%DEBUG_DIR%"

REM Caminho do Chrome (ajustar se necessário)
set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe

REM Se não encontrar, tentar caminho alternativo
if not exist "%CHROME_PATH%" (
    set CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
)

REM Verificar se encontrou o Chrome
if not exist "%CHROME_PATH%" (
    echo.
    echo ERRO: Chrome nao encontrado!
    echo Procurei em:
    echo - C:\Program Files\Google\Chrome\Application\chrome.exe
    echo - C:\Program Files ^(x86^)\Google\Chrome\Application\chrome.exe
    echo.
    echo Por favor, ajuste o caminho no arquivo abrir_chrome_debug.bat
    pause
    exit /b 1
)

REM Abrir Chrome em modo debug
echo.
echo Abrindo Chrome...
start "" "%CHROME_PATH%" --remote-debugging-port=9222 --user-data-dir="%DEBUG_DIR%"

echo.
echo Chrome aberto em modo debug!
echo Porta: 9222
echo.
echo Voce pode fechar esta janela agora.
echo.
pause
