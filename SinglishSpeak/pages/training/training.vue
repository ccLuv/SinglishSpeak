<template>
  <view class="page">
    <view class="meta">
      <text class="pill">{{ typeName }}</text>
      <text class="muted">{{ direction }}</text>
    </view>

    <view class="prompt card">
      <view class="head">
        <text class="muted">SOURCE TEXT</text>
        <view v-if="!topicConfirmed" class="topic-actions">
          <button class="topic-action change" :loading="loadingTopic" :disabled="loadingTopic" @click="loadTopic">换一题</button>
          <button class="topic-action confirm" :disabled="!topic || loadingTopic" @click="confirmTopic">
            确定
          </button>
        </view>
      </view>
      <text class="source">{{ topic }}</text>
      <button class="listen" :disabled="!topic" @click="toggleSourceAudio">
        {{ speaking ? "■ 停止播放" : "▶ 播放原文" }}
      </button>
      <text v-if="speechHint" class="speech-hint">{{ speechHint }}</text>
    </view>

    <view class="recorder">
      <view
        class="ring"
        :class="{ active: recording, locked: !topicConfirmed }"
        @click="toggleRecord"
      >
        <view class="mic">{{ recording ? "■" : "●" }}</view>
      </view>
      <text class="timer">{{ timeText }}</text>
      <text class="muted">{{ recordHint }}</text>
    </view>

    <view v-if="audioPath" class="ready card">
      <text>✓ 录音已准备</text>
      <view class="record-actions">
        <button class="record-action preview" :disabled="submitting" @click="playRecording">
          试听
        </button>
        <button class="record-action rerecord" :disabled="submitting" @click="rerecord">
          重新录音
        </button>
      </view>
    </view>

    <button
      class="primary"
      :disabled="!audioPath || !topicConfirmed"
      :loading="submitting"
      @click="submit"
    >
      提交 AI 测评
    </button>
  </view>
</template>

<script setup>
import { computed, onUnmounted, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { request, uploadAudio } from "../../utils/api";

const typeCode = ref("");
const typeName = ref("口译训练");
const questionId = ref("");
const topic = ref("");
const topicLanguage = ref("en");
const topicConfirmed = ref(false);
const loadingTopic = ref(false);
const recording = ref(false);
const speaking = ref(false);
const seconds = ref(0);
const audioPath = ref("");
const submitting = ref(false);
const speechHint = ref("");

let timer = null;
let sourceAudio = null;
let recordingAudio = null;
let recorder = null;
let mediaRecorder = null;
let mediaStream = null;
let recordedChunks = [];
let playbackSession = 0;

// uni.getRecorderManager 在 H5 端不受支持，只能在非 H5 平台初始化。
// #ifndef H5
recorder = uni.getRecorderManager();
// #endif

const direction = computed(() =>
  topicLanguage.value === "zh" ? "中译英" : "英译中",
);

const timeText = computed(
  () =>
    `${String(Math.floor(seconds.value / 60)).padStart(2, "0")}:${String(
      seconds.value % 60,
    ).padStart(2, "0")}`,
);

const recordHint = computed(() => {
  if (recording.value) return "正在录音，点击停止";
  if (audioPath.value) return "录音完成，可重新录制";
  if (!topicConfirmed.value) return "请先确定题目，再开始录音";
  return "点击开始口译录音";
});

onLoad((query) => {
  typeCode.value = query.code || "";
  typeName.value = decodeURIComponent(query.name || "口译训练");
  loadTopic();
});

async function loadTopic() {
  if (topicConfirmed.value || loadingTopic.value) return;
  loadingTopic.value = true;
  stopSourceAudio();
  clearPreviousRecording();
  seconds.value = 0;
  try {
    const excludeQuery = questionId.value
      ? `&excludeId=${encodeURIComponent(questionId.value)}`
      : "";
    const data = await request(
      `/api/getTopic?type=${encodeURIComponent(typeCode.value)}${excludeQuery}`,
    );
    questionId.value = data.id;
    topic.value = data.topic;
    topicLanguage.value = data.language || "en";
    topicConfirmed.value = false;
  } catch (error) {
    uni.showToast({ title: error.message, icon: "none" });
  } finally {
    loadingTopic.value = false;
  }
}

function confirmTopic() {
  if (!questionId.value || !topic.value) {
    uni.showToast({ title: "题目尚未加载", icon: "none" });
    return;
  }
  topicConfirmed.value = true;
  uni.showToast({ title: "题目已确定", icon: "success" });
}

async function toggleSourceAudio() {
  if (speaking.value) {
    stopSourceAudio();
    return;
  }

  if (!questionId.value) {
    uni.showToast({ title: "题目尚未加载", icon: "none" });
    return;
  }

  speaking.value = true;
  speechHint.value = "正在生成新加坡语音...";
  const currentSession = ++playbackSession;

  try {
    const data = await request("/api/edge-tts", {
      method: "POST",
      data: { questionId: questionId.value },
      timeout: 60000,
    });

    // 用户可能在语音生成期间点击停止、换题或录音，旧请求不应继续播放。
    if (currentSession !== playbackSession || !speaking.value) return;

    // H5使用浏览器原生Audio，避免uni InnerAudioContext在Chrome中
    // 偶发不触发ended/error或无法解码远程MP3的问题。
    const isBrowserAudio =
      typeof window !== "undefined" && typeof window.Audio === "function";
    const audio = isBrowserAudio
      ? new window.Audio()
      : uni.createInnerAudioContext();
    sourceAudio = audio;
    audio.src = data.audioUrl;

    const handlePlay = () => {
      if (sourceAudio !== audio) return;
      speechHint.value = "正在播放原文";
    };
    const handleEnded = () => finishSourceAudio(audio);
    const handleError = () => {
      if (sourceAudio !== audio) return;
      finishSourceAudio(audio);
      speechHint.value = "音频播放失败，请检查后端音频地址";
    };

    if (isBrowserAudio) {
      audio.onplay = handlePlay;
      audio.onended = handleEnded;
      audio.onerror = handleError;
      audio.preload = "auto";
      const playResult = audio.play();
      if (playResult && typeof playResult.catch === "function") {
        playResult.catch(handleError);
      }
    } else {
      audio.onPlay(handlePlay);
      audio.onEnded(handleEnded);
      audio.onStop(handleEnded);
      audio.onError(handleError);
      audio.play();
    }
  } catch (error) {
    if (currentSession !== playbackSession) return;
    finishSourceAudio();
    speechHint.value = error.message;
    uni.showToast({ title: error.message, icon: "none" });
  }
}

function detachSourceAudioEvents(audio) {
  if (!audio) return;
  if (typeof HTMLAudioElement !== "undefined" && audio instanceof HTMLAudioElement) {
    audio.onplay = null;
    audio.onended = null;
    audio.onerror = null;
    audio.onpause = null;
    return;
  }
  if (typeof audio.offPlay === "function") audio.offPlay();
  if (typeof audio.offEnded === "function") audio.offEnded();
  if (typeof audio.offStop === "function") audio.offStop();
  if (typeof audio.offError === "function") audio.offError();
}

function destroySourceAudio(audio) {
  if (!audio) return;
  if (typeof HTMLAudioElement !== "undefined" && audio instanceof HTMLAudioElement) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    return;
  }
  audio.destroy();
}

function finishSourceAudio(audio = sourceAudio) {
  // 先清空共享引用，再销毁对象，避免 destroy/stop 再次触发回调时重复清理。
  if (audio && sourceAudio && audio !== sourceAudio) return;
  speaking.value = false;
  speechHint.value = "";
  sourceAudio = null;

  if (audio) {
    detachSourceAudioEvents(audio);
    destroySourceAudio(audio);
  }
}

function stopSourceAudio() {
  playbackSession++;
  const audio = sourceAudio;
  sourceAudio = null;
  speaking.value = false;
  speechHint.value = "";

  if (!audio) return;
  detachSourceAudioEvents(audio);
  if (typeof audio.stop === "function") audio.stop();
  destroySourceAudio(audio);
}

async function toggleRecord() {
  if (recording.value) {
    // #ifdef H5
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
    // #endif

    // #ifndef H5
    recorder.stop();
    // #endif
    return;
  }

  if (!topicConfirmed.value) {
    uni.showToast({ title: "请先点击确定题目", icon: "none" });
    return;
  }

  stopSourceAudio();
  clearPreviousRecording();
  seconds.value = 0;

  // #ifdef H5
  await startBrowserRecording();
  // #endif

  // #ifndef H5
  recorder.start({
    format: "mp3",
    sampleRate: 16000,
    numberOfChannels: 1,
    encodeBitRate: 48000,
  });
  // #endif
}

// #ifdef H5
async function startBrowserRecording() {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia ||
    typeof MediaRecorder === "undefined"
  ) {
    uni.showToast({
      title: "当前浏览器不支持录音，请使用最新版 Chrome 或 Edge",
      icon: "none",
    });
    return;
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(mediaStream);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) recordedChunks.push(event.data);
    };

    mediaRecorder.onstart = () => {
      recording.value = true;
      timer = setInterval(() => seconds.value++, 1000);
    };

    mediaRecorder.onstop = () => {
      recording.value = false;
      clearInterval(timer);

      const mimeType = mediaRecorder.mimeType || "audio/webm";
      const audioBlob = new Blob(recordedChunks, { type: mimeType });
      audioPath.value = URL.createObjectURL(audioBlob);

      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
      }
    };

    mediaRecorder.start();
  } catch (error) {
    recording.value = false;
    clearInterval(timer);
    uni.showToast({
      title: "无法使用麦克风，请允许浏览器访问麦克风",
      icon: "none",
    });
  }
}
// #endif

// #ifndef H5
recorder.onStart(() => {
  recording.value = true;
  timer = setInterval(() => seconds.value++, 1000);
});

recorder.onStop((result) => {
  recording.value = false;
  clearInterval(timer);
  audioPath.value = result.tempFilePath;
});

recorder.onError(() => {
  recording.value = false;
  clearInterval(timer);
  uni.showToast({ title: "请检查麦克风权限", icon: "none" });
});
// #endif

function playRecording() {
  stopRecordingPlayback();
  recordingAudio = uni.createInnerAudioContext();
  recordingAudio.src = audioPath.value;
  recordingAudio.play();
}

function stopRecordingPlayback() {
  if (!recordingAudio) return;
  if (typeof recordingAudio.stop === "function") recordingAudio.stop();
  recordingAudio.destroy();
  recordingAudio = null;
}

function clearPreviousRecording() {
  stopRecordingPlayback();

  // #ifdef H5
  if (audioPath.value && audioPath.value.startsWith("blob:")) {
    URL.revokeObjectURL(audioPath.value);
  }
  // #endif

  audioPath.value = "";
}

function rerecord() {
  if (recording.value || submitting.value) return;
  clearPreviousRecording();
  seconds.value = 0;
}

async function submit() {
  if (!topicConfirmed.value) {
    uni.showToast({ title: "请先点击确定题目", icon: "none" });
    return;
  }
  if (seconds.value < 2) {
    uni.showToast({
      title: "录音少于2秒，判定为无效，请重新录音",
      icon: "none",
    });
    return;
  }

  submitting.value = true;
  try {
    const uploaded = await uploadAudio(audioPath.value, {
      questionId: questionId.value,
      language: topicLanguage.value === "zh" ? "en" : "zh",
    });
    const result = await request("/api/evaluate", {
      method: "POST",
      timeout: 120000,
      data: {
        audioId: uploaded.audioId,
        questionId: questionId.value,
        type: typeCode.value,
        sourceText: topic.value,
        transcription: uploaded.transcription?.text || "",
      },
    });
    uni.setStorageSync("latestEvaluation", {
      ...result.evaluation,
      type: typeName.value,
      sourceText: topic.value,
      audioPath: audioPath.value,
      transcription: uploaded.transcription?.text || "",
    });
    uni.redirectTo({ url: "/pages/result/result" });
  } catch (error) {
    uni.showToast({ title: error.message, icon: "none" });
  } finally {
    submitting.value = false;
  }
}

onUnmounted(() => {
  clearInterval(timer);
  stopSourceAudio();
  stopRecordingPlayback();

  // #ifdef H5
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
  }
  if (audioPath.value && audioPath.value.startsWith("blob:")) URL.revokeObjectURL(audioPath.value);
  // #endif
});
</script>

<style scoped>
.meta,
.head,
.ready {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.meta { margin: 10rpx 0 26rpx; }
.pill {
  padding: 12rpx 22rpx;
  border-radius: 28rpx;
  background: #dff1ea;
  color: #176b52;
}
.prompt { padding: 36rpx; }
.link { color: #176b52; }
.topic-actions {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.topic-action {
  min-width: 130rpx;
  margin: 0;
  padding: 0 22rpx;
  border-radius: 28rpx;
  font-size: 24rpx;
  line-height: 54rpx;
}
.topic-action::after { border: 0; }
.change { background: #eef6f3; color: #176b52; }
.confirm { background: #176b52; color: #fff; }
.source {
  display: block;
  margin: 30rpx 0;
  font-size: 34rpx;
  font-weight: 650;
  line-height: 1.65;
}
.listen {
  border-radius: 40rpx;
  background: #eef6f3;
  color: #176b52;
}
.speech-hint {
  display: block;
  margin-top: 18rpx;
  color: #75847f;
  font-size: 23rpx;
  text-align: center;
}
.recorder {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 70rpx 0 42rpx;
}
.ring {
  width: 190rpx;
  height: 190rpx;
  padding: 24rpx;
  border-radius: 50%;
  background: #d8eee7;
}
.ring.locked { opacity: 0.45; }
.mic {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 142rpx;
  border-radius: 50%;
  background: #176b52;
  color: #fff;
  font-size: 50rpx;
}
.active .mic { background: #d45151; }
.timer {
  margin: 35rpx 0 8rpx;
  font-size: 45rpx;
  font-weight: 750;
}
.ready {
  margin-bottom: 28rpx;
  padding: 25rpx 30rpx;
  color: #176b52;
}
.record-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.record-action {
  min-width: 132rpx;
  margin: 0;
  padding: 0 22rpx;
  border-radius: 30rpx;
  font-size: 24rpx;
  line-height: 58rpx;
}
.record-action::after { border: 0; }
.preview {
  background: #eef6f3;
  color: #176b52;
}
.rerecord {
  background: #176b52;
  color: #fff;
}
</style>
