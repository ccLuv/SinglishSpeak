<template>
  <view class="page">
    <view class="score-card card">
      <text class="muted">本次综合得分</text>
      <view class="score">{{ data.score ?? 0 }}<text>/100</text></view>
      <text class="level">{{ level }}</text>
      <text v-if="data.model" class="model">由 {{ data.model }} 评估</text>
    </view>

    <view v-if="data.validInterpretation === false" class="invalid-notice">
      <text class="invalid-title">未检测到有效口译内容</text>
      <text v-if="data.relevanceReason" class="invalid-reason">{{ data.relevanceReason }}</text>
    </view>

    <view v-if="data.scores" class="card section">
      <text class="section-title">分项评分</text>
      <view v-for="item in scoreItems" :key="item.key" class="score-row">
        <view class="score-label">
          <text>{{ item.name }}</text>
          <text>{{ data.scores[item.key] ?? 0 }}/{{ item.max }}</text>
        </view>
        <view class="bar">
          <view
            class="bar-value"
            :style="{ width: scorePercent(item.key, item.max) + '%' }"
          />
        </view>
      </view>
    </view>

    <view class="card section">
      <text class="section-title">语音转写</text>
      <text class="paragraph">{{ data.transcription || "未获得转写文本" }}</text>
    </view>

    <view class="card section">
      <text class="section-title">AI 总体反馈</text>
      <text class="paragraph">{{ data.feedback || "暂无反馈" }}</text>

      <template v-if="data.strengths?.length">
        <text class="sub-title">做得好的地方</text>
        <view v-for="(item, index) in data.strengths" :key="`strength-${index}`" class="list-row good">
          <text>✓</text><text>{{ item }}</text>
        </view>
      </template>

      <template v-if="data.issues?.length">
        <text class="sub-title">需要改进</text>
        <view v-for="(issue, index) in data.issues" :key="`issue-${index}`" class="issue">
          <text class="issue-tag">{{ issue.category }}</text>
          <text v-if="issue.explanation" class="paragraph">{{ issue.explanation }}</text>
          <text v-if="issue.source" class="quote">原文：{{ issue.source }}</text>
          <text v-if="issue.student" class="quote">你的表达：{{ issue.student }}</text>
        </view>
      </template>

      <template v-if="data.suggestions?.length">
        <text class="sub-title">练习建议</text>
        <view v-for="(item, index) in data.suggestions" :key="`suggestion-${index}`" class="list-row">
          <text>{{ String(index + 1).padStart(2, "0") }}</text><text>{{ item }}</text>
        </view>
      </template>
    </view>

    <view v-if="data.correctedTranslation" class="card section">
      <text class="section-title">参考改进译文</text>
      <text class="paragraph">{{ data.correctedTranslation }}</text>
    </view>

    <view class="notice">评分依据为语音转写文本，不包含发音和音色评价。</view>
    <button class="primary" :loading="saving" @click="save">保存训练记录</button>
    <button class="ghost" @click="again">再练一次</button>
  </view>
</template>

<script setup>
import { computed, ref } from "vue";
import { request } from "../../utils/api";

const data = ref(uni.getStorageSync("latestEvaluation") || {});
const saving = ref(false);
const scoreItems = [
  { key: "accuracy", name: "语义准确度", max: 40 },
  { key: "completeness", name: "信息完整度", max: 25 },
  { key: "targetLanguage", name: "目标语表达", max: 20 },
  { key: "terminology", name: "术语与数字", max: 15 },
];

const level = computed(() => {
  if (data.value.score >= 90) return "优秀";
  if (data.value.score >= 75) return "表现良好";
  if (data.value.score >= 60) return "达到基础要求";
  return "继续练习";
});

function scorePercent(key, maximum) {
  return Math.min(100, Math.max(0, ((data.value.scores?.[key] || 0) / maximum) * 100));
}

async function save() {
  saving.value = true;
  try {
    await request("/api/saveHistory", {
      method: "POST",
      data: {
        type: data.value.type,
        sourceText: data.value.sourceText,
        transcription: data.value.transcription,
        audioPath: data.value.audioPath,
        score: data.value.score,
        scores: data.value.scores,
        feedback: data.value.feedback,
        strengths: data.value.strengths,
        issues: data.value.issues,
        suggestions: data.value.suggestions,
        correctedTranslation: data.value.correctedTranslation,
        validInterpretation: data.value.validInterpretation,
        relevanceReason: data.value.relevanceReason,
        model: data.value.model,
      },
    });
    uni.showToast({ title: "已保存" });
    setTimeout(() => uni.reLaunch({ url: "/pages/home/home" }), 700);
  } catch (error) {
    uni.showToast({ title: error.message, icon: "none" });
  } finally {
    saving.value = false;
  }
}

function again() {
  uni.reLaunch({ url: "/pages/home/home" });
}
</script>

<style scoped>
.score-card { text-align: center; padding: 52rpx; margin: 10rpx 0 28rpx; }
.score { font-size: 108rpx; font-weight: 850; color: #176b52; margin: 12rpx; }
.score text { font-size: 28rpx; color: #9aa5a1; }
.level { padding: 10rpx 24rpx; border-radius: 30rpx; background: #e1f2eb; color: #176b52; }
.model { display: block; margin-top: 22rpx; color: #8a9792; font-size: 22rpx; }
.invalid-notice { margin-bottom: 26rpx; padding: 30rpx; border-radius: 20rpx; background: #fff0ed; color: #a23d32; }
.invalid-title { display: block; font-size: 31rpx; font-weight: 750; }
.invalid-reason { display: block; margin-top: 12rpx; font-size: 24rpx; line-height: 1.6; }
.section { padding: 36rpx; margin-bottom: 26rpx; }
.section-title { display: block; font-size: 31rpx; font-weight: 750; margin-bottom: 24rpx; }
.sub-title { display: block; margin: 34rpx 0 14rpx; font-size: 27rpx; font-weight: 700; }
.paragraph { display: block; font-size: 28rpx; line-height: 1.7; }
.score-row { margin-top: 24rpx; }
.score-label { display: flex; justify-content: space-between; margin-bottom: 10rpx; color: #44534e; }
.bar { height: 14rpx; overflow: hidden; border-radius: 12rpx; background: #e5eeeb; }
.bar-value { height: 100%; border-radius: 12rpx; background: #209774; }
.list-row { display: flex; gap: 18rpx; padding: 20rpx 0; border-top: 1rpx solid #e7eeeb; line-height: 1.55; }
.list-row > text:first-child { color: #209774; font-weight: 800; }
.good { color: #176b52; }
.issue { margin-top: 18rpx; padding: 24rpx; border-radius: 18rpx; background: #fff7ea; }
.issue-tag { display: inline-block; padding: 6rpx 14rpx; margin-bottom: 12rpx; border-radius: 18rpx; background: #ffe6bc; color: #805b1f; font-size: 22rpx; }
.quote { display: block; margin-top: 8rpx; color: #64716d; font-size: 24rpx; line-height: 1.55; }
.notice { background: #fff5dd; color: #80652d; padding: 24rpx; border-radius: 18rpx; font-size: 22rpx; margin-bottom: 28rpx; }
.ghost { margin-top: 20rpx; }
</style>
