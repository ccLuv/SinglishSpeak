@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Please run setup.bat first.
  pause
  exit /b 1
)
if not defined ASR_MODEL set ASR_MODEL=small
if not defined ASR_DEVICE set ASR_DEVICE=cpu
if not defined ASR_COMPUTE_TYPE set ASR_COMPUTE_TYPE=int8
echo ASR service: http://127.0.0.1:8000
echo The model is downloaded on the first transcription request.
".venv\Scripts\python.exe" -m uvicorn app:app --host 127.0.0.1 --port 8000
pause
