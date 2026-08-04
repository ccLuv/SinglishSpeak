@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" python -m venv .venv
".venv\Scripts\python.exe" -m pip install --upgrade pip
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
  echo Installation failed. Python 3.10 to 3.13 is recommended if Python 3.14 has no compatible wheel.
  pause
  exit /b 1
)
echo ASR installation completed.
pause
