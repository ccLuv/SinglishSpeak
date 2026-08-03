@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist "node_modules\express" (
  echo [SinglishSpeak] 首次运行，正在安装后端依赖...
  call npm install --cache ".npm-cache" --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo 依赖安装失败，请检查网络连接和 Node.js/npm 安装。
    pause
    exit /b 1
  )
)

echo [SinglishSpeak] 后端正在启动：http://127.0.0.1:3000
if not exist ".venv\Scripts\python.exe" (
  echo [SinglishSpeak] Installing edge-tts for the first run...
  python -m venv .venv
  ".venv\Scripts\python.exe" -m pip install edge-tts
  if errorlevel 1 (
    echo edge-tts installation failed. Run setup-edge-tts.bat and try again.
    pause
    exit /b 1
  )
)

node server.js
pause
