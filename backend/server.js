const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { evaluateWithDeepSeek } = require('./services/deepseekEvaluator');
require('dotenv').config();

const app = express();
const port = 3000;
const generatedAudioDirectory = path.join(__dirname, 'generated-audio');
const execFileAsync = promisify(execFile);
const edgeTtsPython = path.join(__dirname, '.venv', 'Scripts', 'python.exe');
const edgeTtsScript = path.join(__dirname, 'edge_tts_generate.py');

async function generateEdgeAudio(argumentsList) {
    let lastError;

    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            await execFileAsync(edgeTtsPython, argumentsList, {
                cwd: __dirname,
                timeout: 60000,
                windowsHide: true,
                maxBuffer: 1024 * 1024
            });
            return;
        } catch (error) {
            lastError = error;
            if (attempt < 2) {
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        }
    }

    throw lastError;
}

// 五类口译训练题库。参考译文和关键词只保留在后端，出题接口不会返回。
const questionBankDirectory = path.join(__dirname, 'data', 'questions');
const questionBankFiles = {
    government: 'government.json',
    business: 'business.json',
    education: 'education.json',
    legal: 'legal.json',
    community: 'community.json'
};

function getQuestionBank(type) {
    const filename = questionBankFiles[type];
    if (!filename) return null;

    const filePath = path.join(questionBankDirectory, filename);
    if (!fs.existsSync(filePath)) return null;

    const questions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(questions) ? questions : null;
}

function getQuestionById(questionId) {
    for (const type of Object.keys(questionBankFiles)) {
        const questions = getQuestionBank(type) || [];
        const question = questions.find(item => item.id === questionId);
        if (question) return question;
    }
    return null;
}

function countEffectiveCharacters(text) {
    return (String(text || '').match(/[\p{L}\p{N}]/gu) || []).length;
}

function escapeSsml(text) {
    return String(text)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

app.use(cors());
app.use(express.json());
app.use('/audio', express.static(generatedAudioDirectory));

// ===================== 持久化存储：保存账号密码到文件 =====================
const userFile = path.join(__dirname, 'user.json');

// 初始化文件
if (!fs.existsSync(userFile)) {
    fs.writeFileSync(userFile, JSON.stringify({
        username: 'admin',
        password: '123456'
    }, null, 2));
}

// 读取用户
function getUser() {
    return JSON.parse(fs.readFileSync(userFile, 'utf8'));
}

// 保存用户
function saveUser(user) {
    fs.writeFileSync(userFile, JSON.stringify(user, null, 2));
}

// ===================== 训练历史持久化（新增功能） =====================
const historyFile = path.join(__dirname, 'history.json');

// 初始化历史记录文件
if (!fs.existsSync(historyFile)) {
    fs.writeFileSync(historyFile, JSON.stringify([], null, 2));
}

// 获取所有训练历史
function getHistoryList() {
    return JSON.parse(fs.readFileSync(historyFile, 'utf8'));
}

// 保存一条训练历史
function saveHistoryItem(item) {
    let list = getHistoryList();
    item.id = Date.now(); // 给每条记录一个唯一ID
    list.unshift(item);   // 最新记录放在最上面
    fs.writeFileSync(historyFile, JSON.stringify(list, null, 2));
}

// 上传配置
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'uploads', 'audio');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// 登录接口
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = getUser();
    if (username === user.username && password === user.password) {
        res.json({ code: 200, msg: 'success' });
    } else {
        res.json({ code: 400, msg: 'invalid username or password!' });
    }
});

// 训练类别列表
app.get('/api/getTypeList', (req, res) => {
    res.json({
        code: 200,
        data: [
            { name: "政府与政策", code: "government" },
            { name: "商务与投资", code: "business" },
            { name: "学校与教育", code: "education" },
            { name: "法律与机构参访", code: "legal" },
            { name: "社区与公共服务", code: "community" }
        ]
    });
});

app.get('/api/getTopic', (req, res) => {
    const { type, excludeId } = req.query;
    const questions = getQuestionBank(type);

    if (!questions || questions.length === 0) {
        return res.status(404).json({
            code: 404,
            msg: '当前训练分类暂无可用题目'
        });
    }

    // 换题时排除当前题。若题库只有一题，则仍允许返回该题。
    const candidates = questions.length > 1 && excludeId
        ? questions.filter(question => question.id !== excludeId)
        : questions;
    const question = candidates[Math.floor(Math.random() * candidates.length)];

    // 不向前端返回参考译文和关键词，避免提前泄露评分依据。
    res.json({
        code: 200,
        data: {
            id: question.id,
            topic: question.text,
            text: question.text,
            language: question.language,
            direction: question.direction,
            difficulty: question.difficulty
        }
    });
});

// Azure Speech 文字转语音。密钥仅保存在后端 .env，不会发送到前端。
app.post('/api/tts', async (req, res) => {
    try {
        const { questionId } = req.body;
        const question = getQuestionById(questionId);

        if (!question) {
            return res.status(404).json({
                code: 404,
                msg: '未找到对应题目'
            });
        }

        const speechKey = process.env.AZURE_SPEECH_KEY;
        const speechRegion = process.env.AZURE_SPEECH_REGION;
        if (!speechKey || !speechRegion) {
            return res.status(503).json({
                code: 503,
                msg: 'Azure Speech 尚未配置，请检查后端 .env'
            });
        }

        const englishVoice = process.env.AZURE_SPEECH_VOICE_EN || 'en-SG-LunaNeural';
        const chineseVoice = process.env.AZURE_SPEECH_VOICE_ZH || 'zh-CN-XiaoxiaoNeural';
        const voice = question.language === 'zh' ? chineseVoice : englishVoice;
        const locale = question.language === 'zh' ? 'zh-CN' : 'en-SG';
        const rate = process.env.AZURE_SPEECH_RATE || '-12%';
        const audioFilename = `${question.id}-${voice}.mp3`;
        const audioPath = path.join(generatedAudioDirectory, audioFilename);

        fs.mkdirSync(generatedAudioDirectory, { recursive: true });

        // 已生成的题目直接读取缓存，不重复调用Azure。
        if (!fs.existsSync(audioPath)) {
            const ssml = [
                `<speak version="1.0" xml:lang="${locale}">`,
                `<voice name="${voice}">`,
                `<prosody rate="${rate}">${escapeSsml(question.text)}</prosody>`,
                '</voice>',
                '</speak>'
            ].join('');

            const endpoint =
                `https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;
            const response = await axios.post(endpoint, ssml, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    'Ocp-Apim-Subscription-Key': speechKey,
                    'Content-Type': 'application/ssml+xml',
                    'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
                    'User-Agent': 'SinglishSpeak'
                }
            });
            fs.writeFileSync(audioPath, Buffer.from(response.data));
        }

        const host = req.get('host');
        res.json({
            code: 200,
            data: {
                audioUrl: `${req.protocol}://${host}/audio/${encodeURIComponent(audioFilename)}`,
                voice,
                cached: true
            }
        });
    } catch (error) {
        const azureMessage =
            error.response?.data instanceof Buffer
                ? error.response.data.toString('utf8')
                : error.response?.data;
        console.error('Azure TTS error:', error.response?.status, azureMessage || error.message);
        res.status(502).json({
            code: 502,
            msg: 'Azure语音生成失败，请检查密钥、区域和音色配置'
        });
    }
});

// 上传录音
app.post('/api/edge-tts', async (req, res) => {
    try {
        const { questionId } = req.body;
        const question = getQuestionById(questionId);

        if (!question) {
            return res.status(404).json({
                code: 404,
                msg: '未找到对应题目'
            });
        }

        if (!fs.existsSync(edgeTtsPython) || !fs.existsSync(edgeTtsScript)) {
            return res.status(503).json({
                code: 503,
                msg: 'edge-tts 尚未安装，请运行后端目录中的 setup-edge-tts.bat'
            });
        }

        const englishVoice = process.env.EDGE_TTS_VOICE_EN || 'en-SG-LunaNeural';
        const chineseVoice = process.env.EDGE_TTS_VOICE_ZH || 'zh-CN-XiaoxiaoNeural';
        const voice = question.language === 'zh' ? chineseVoice : englishVoice;
        const language = question.language === 'zh' ? 'zh-CN' : 'en-SG';
        const rate = process.env.EDGE_TTS_RATE || '-10%';
        const audioFilename = `${question.id}-${voice}.mp3`;
        const audioPath = path.join(generatedAudioDirectory, audioFilename);

        fs.mkdirSync(generatedAudioDirectory, { recursive: true });

        const wasCached = fs.existsSync(audioPath) && fs.statSync(audioPath).size > 0;
        if (!wasCached) {
            await generateEdgeAudio([
                edgeTtsScript,
                '--text', String(question.text),
                '--voice', voice,
                '--rate', rate,
                '--output', audioPath
            ]);
        }

        const host = req.get('host');
        res.json({
            code: 200,
            data: {
                audioUrl: `${req.protocol}://${host}/audio/${encodeURIComponent(audioFilename)}`,
                voice,
                language,
                cached: wasCached
            }
        });
    } catch (error) {
        console.error('edge-tts error:', error.stderr || error.message);
        res.status(502).json({
            code: 502,
            msg: '语音生成失败，请检查电脑网络连接后重试'
        });
    }
});

app.post('/api/uploadAudio', upload.single('audio'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ code: 400, msg: 'No audio file received' });
    }
    try {
        const question = getQuestionById(req.body.questionId);
        const asrServiceUrl = process.env.ASR_SERVICE_URL || 'http://127.0.0.1:8000';
        const prompt = question
            ? `Singapore interpreting exercise. The recording may contain English and Mandarin. Source topic: ${question.text}`
            : 'Singapore interpreting exercise. The recording may contain English and Mandarin.';
        const response = await axios.post(`${asrServiceUrl}/transcribe`, {
            audioPath: path.resolve(req.file.path),
            language: req.body.language || undefined,
            prompt
        }, {
            timeout: Number(process.env.ASR_TIMEOUT_MS || 300000)
        });

        const transcription = response.data || {};
        const duration = Number(transcription.duration || 0);
        const effectiveCharacters = countEffectiveCharacters(transcription.text);

        if (duration < 2) {
            return res.status(422).json({
                code: 422,
                msg: '录音少于2秒，判定为无效，请重新录音'
            });
        }
        if (effectiveCharacters < 5) {
            return res.status(422).json({
                code: 422,
                msg: '有效转写少于5个字符，判定为无效，请重新录音并清晰作答'
            });
        }

        res.json({
            code: 200,
            data: {
                audioId: path.parse(req.file.filename).name,
                transcription
            }
        });
    } catch (error) {
        const details = error.response?.data?.detail || error.message;
        console.error('ASR transcription error:', details);
        res.status(502).json({
            code: 502,
            msg: `语音转写失败：${details}。请确认 asr-service/start.bat 正在运行`
        });
    }
});

// DeepSeek口译内容评估
app.post('/api/evaluate', async (req, res) => {
    const { questionId, transcription } = req.body;
    const question = getQuestionById(questionId);

    if (!question) {
        return res.status(404).json({ code: 404, msg: '未找到对应题目' });
    }
    if (countEffectiveCharacters(transcription) < 5) {
        return res.status(400).json({
            code: 400,
            msg: '有效转写少于5个字符，判定为无效，请重新录音并清晰作答'
        });
    }

    try {
        const evaluation = await evaluateWithDeepSeek({
            question,
            transcription: String(transcription).trim()
        });
        res.json({ code: 200, data: { evaluation } });
    } catch (error) {
        const apiMessage = error.response?.data?.error?.message;
        const status = error.code === 'MISSING_API_KEY' ? 503 : 502;
        console.error('DeepSeek evaluation error:', apiMessage || error.message);
        res.status(status).json({
            code: status,
            msg: error.code === 'MISSING_API_KEY'
                ? 'DeepSeek 尚未配置：请在 backend/.env 中填写 DEEPSEEK_API_KEY'
                : `DeepSeek 评分失败：${apiMessage || error.message}`
        });
    }
});

// ========================== 百度语音接口 ==========================
app.post('/api/speak', (req, res) => {
    try {
        const text = req.body.text;
        if (!text) {
            return res.json({ code: 400, msg: "Text cannnot be empty!" });
        }

        const encoded = encodeURIComponent(text);
        const options = {
            hostname: 'tts.baidu.com',
            path: `/text2audio?lan=zh&ie=UTF-8&spd=5&text=${encoded}`,
            method: 'GET'
        };

        const request = http.request(options, (resp) => {
            res.setHeader('Content-Type', 'audio/mp3');
            resp.pipe(res);
        });

        request.on('error', (e) => {
            res.json({ code: 500, msg: "语音失败" });
        });

        request.end();

    } catch (e) {
        res.json({ code: 500, msg: "错误" });
    }
});

// ===================== 保存训练记录（新增接口） =====================
app.post('/api/saveHistory', (req, res) => {
    const record = req.body;
    record.time = new Date().toLocaleString(); // 自动记录训练时间
    saveHistoryItem(record);
    res.json({ code: 200, msg: "Training record saved successfully!" });
});

// ===================== 获取训练记录（新增接口） =====================
app.get('/api/getHistory', (req, res) => {
    const list = getHistoryList();
    res.json({ code: 200, data: list });
});

// 修改用户名
app.post('/api/changeUsername', (req, res) => {
    const { newUsername } = req.body;
    if (!newUsername) {
        return res.json({ code: 400, msg: "New username cannot be empty!" });
    }
    const user = getUser();
    user.username = newUsername;
    saveUser(user);
    res.json({ code: 200, msg: "Modification successful!" });
});

// 修改密码
app.post('/api/changePassword', (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = getUser();
    if (oldPassword !== user.password) {
        return res.json({ code: 400, msg: "Original password is incorrect!" });
    }
    if (!newPassword) {
        return res.json({ code: 400, msg: "New password cannot be empty!" });
    }
    user.password = newPassword;
    saveUser(user);
    res.json({ code: 200, msg: "Modification successful!" });
});

// 退出登录
app.post('/api/logout', (req, res) => {
    res.json({ code: 200, msg: "退出成功" });
});

// 启动服务 - 监听所有网络接口
app.listen(port, '0.0.0.0', () => {
    console.log('Server running on http://0.0.0.0:' + port);

    // 获取并显示本机局域网IP
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                console.log('手机请访问: http://' + net.address + ':' + port);
            }
        }
    }
});
