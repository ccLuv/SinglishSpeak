# SinglishSpeak

面向新加坡语境的 AI 辅助中英口译训练与反馈应用。项目使用 Vue 3 与 uni-app 构建前端，Express 提供后端接口，并通过 edge-tts 实现新加坡英语与普通话题目朗读。

## 功能

- 五类中英口译训练题库，共 50 道题
- 随机选题与换题
- 新加坡英语和普通话在线语音朗读
- 浏览器与 App 录音
- 训练记录、账户名称与密码管理
- AI 测评接口预留（当前为原型评分，尚未接入正式 ASR 与 DeepSeek 测评链路）

## 项目结构

```text
.
├─ SinglishSpeak/       Vue 3 + uni-app 前端
└─ backend/             Express 后端、题库和 edge-tts 生成器
```

## 环境要求

- HBuilderX
- Node.js 20 或更高版本
- Python 3.10 或更高版本
- 可访问 Microsoft Edge 在线语音服务的网络

## 启动后端

在 `backend` 目录双击 `start.bat`。首次运行会自动安装 npm 依赖和 edge-tts Python 依赖。

也可以手动执行：

```powershell
cd backend
npm install
setup-edge-tts.bat
node server.js
```

启动后可访问：

```text
http://127.0.0.1:3000/api/getTopic?type=government
```

## 启动前端

1. 使用 HBuilderX 打开 `SinglishSpeak`。
2. 确认 `SinglishSpeak/config.js` 中的后端地址正确。
3. 选择“运行到浏览器”或“运行到手机”。

本机浏览器默认使用 `http://127.0.0.1:3000`。真机调试时需要改成运行后端电脑的局域网 IP。

## 默认原型账户

```text
用户名：admin
密码：123456
```

首次启动后端时会在本地创建 `user.json` 和 `history.json`。这些运行数据、录音、生成音频、虚拟环境和依赖目录均不会提交到 Git。

## 语音配置

- 英语：`en-SG-LunaNeural`（新加坡英语）
- 中文：`zh-CN-XiaoxiaoNeural`（普通话）

可复制 `backend/.env.example` 为 `backend/.env` 调整音色和语速。

## 当前限制

- `/api/evaluate` 仍返回原型评分。
- MERaLiON ASR 和 DeepSeek 结构化评分尚未正式接入。
- edge-tts 适合教学原型，生产环境建议替换为有服务保障的正式语音 API。

## License

本项目暂未指定开源许可证。未经作者许可，不授予复制、修改或商业使用权。
