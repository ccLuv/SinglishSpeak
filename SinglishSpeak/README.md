# SinglishSpeak

Vue 3 + uni-app，可直接由 HBuilderX 打开。

1. 在项目的 `backend` 目录双击 `start.bat`，或执行 `node server.js`。
2. 打开 `config.js` 配置后端地址。浏览器本机使用 http://127.0.0.1:3000，真机改为电脑局域网 IP。
3. 在 HBuilderX 选择运行到浏览器或手机。

已对接 login、getTypeList、getTopic、uploadAudio、evaluate、saveHistory、getHistory、changeUsername、changePassword、logout。

注意：当前 evaluate 是原型评分，尚未接入真实 MERaLiON ASR 和 DeepSeek 测评。
