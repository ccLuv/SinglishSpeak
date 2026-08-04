# SinglishSpeak 本地语音转写服务

本服务使用 faster-whisper 把学生录音转成中文或英文文本。

1. 首次使用双击 `setup.bat`。
2. 安装完成后双击 `start.bat` 并保持窗口运行。
3. 再启动 `backend/start.bat` 和前端。

健康检查：`http://127.0.0.1:8000/health`

默认配置是 `small + CPU INT8`，首次转写时模型会下载到 `models`。如需尝试 GPU，可在命令行执行：

```bat
set ASR_DEVICE=cuda
set ASR_COMPUTE_TYPE=int8_float16
start.bat
```
