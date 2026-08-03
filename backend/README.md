# SinglishSpeak 后端

这是可独立运行的 Express 后端，包含五类口译训练题库。

## 环境要求

- Node.js 20 或更高版本
- npm

## 启动方法

最简单的方式是双击 `start.bat`。首次运行会自动安装依赖。

也可以在终端执行：

```powershell
cd <后端目录>
npm install --cache .npm-cache --no-audit --no-fund
npm start
```

启动成功后访问：

```text
http://127.0.0.1:3000/api/getTopic?type=government
```

## 题库

题库位于 `data/questions`：

- `government.json`：政府与政策
- `business.json`：商务与投资
- `education.json`：学校与教育
- `legal.json`：法律与机构参访
- `community.json`：社区与公共服务

每类现有10题，共50题。调用接口时可通过 `excludeId` 排除当前题：

```text
/api/getTopic?type=government&excludeId=government-en-001
```

## 默认账户

```text
用户名：admin
密码：123456
```

当前账户数据保存在 `user.json`，训练记录保存在 `history.json`。这是原型项目的数据存储方式，不适合直接用于生产环境。
