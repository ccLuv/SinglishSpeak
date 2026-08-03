@echo off
cd /d "%~dp0"
echo Setting up the edge-tts environment...
if not exist ".venv\Scripts\python.exe" (
    python -m venv .venv
)
".venv\Scripts\python.exe" -m pip install edge-tts
echo.
echo Setup complete. You can now run: node server.js
pause
