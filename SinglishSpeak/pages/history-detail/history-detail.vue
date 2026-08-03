<template>
  <view class="page">
    <view class="score-card card">
      <text class="muted">历史训练得分</text>
      <view class="score">{{ score }}<text v-if="score !== '—'">/100</text></view>
      <text class="tag">{{ record.type || "综合训练" }}</text>
      <text class="time">{{ record.time || "时间未记录" }}</text>
    </view>

    <view class="detail card">
      <text class="label">训练原文</text>
      <text class="content">{{ record.sourceText || "未保存训练原文" }}</text>
    </view>

    <view v-if="record.transcriptText" class="detail card">
      <text class="label">口译转写</text>
      <text class="content">{{ record.transcriptText }}</text>
    </view>

    <view class="detail card">
      <text class="label">测评反馈</text>
      <text class="content">{{ record.feedback || "本次训练暂无文字反馈" }}</text>
      <view
        v-for="(suggestion, index) in record.suggestions || []"
        :key="index"
        class="suggestion"
      >
        <text>{{ index + 1 }}</text>
        <view>{{ suggestion }}</view>
      </view>
    </view>

    <view v-if="hasDimensions" class="detail card">
      <text class="label">分项得分</text>
      <view class="dimension">
        <text>准确度</text><text>{{ record.score_accuracy }}/5</text>
      </view>
      <view class="dimension">
        <text>流利度</text><text>{{ record.score_fluency }}/5</text>
      </view>
      <view class="dimension">
        <text>本地语境</text><text>{{ record.score_local }}/5</text>
      </view>
      <view class="dimension">
        <text>语域表达</text><text>{{ record.score_register }}/5</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from "vue";

const record = ref(uni.getStorageSync("selectedHistory") || {});

const hasDimensions = computed(() =>
  [
    "score_accuracy",
    "score_fluency",
    "score_local",
    "score_register",
  ].some((key) => record.value[key] !== undefined),
);

const score = computed(() => {
  if (record.value.score !== undefined && record.value.score !== null) {
    return record.value.score;
  }
  if (!hasDimensions.value) return "—";
  const values = [
    record.value.score_accuracy,
    record.value.score_fluency,
    record.value.score_local,
    record.value.score_register,
  ].map((value) => Number(value) || 0);
  return Math.round(values.reduce((sum, value) => sum + value, 0) * 5);
});
</script>

<style scoped>
.score-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 10rpx 0 26rpx;
  padding: 46rpx 30rpx;
}
.score {
  margin: 12rpx 0;
  color: #176b52;
  font-size: 90rpx;
  font-weight: 850;
}
.score text { color: #93a09b; font-size: 26rpx; }
.tag {
  padding: 9rpx 20rpx;
  border-radius: 24rpx;
  background: #e2f2ec;
  color: #176b52;
}
.time { margin-top: 18rpx; color: #98a39f; font-size: 22rpx; }
.detail { margin-bottom: 22rpx; padding: 34rpx; }
.label {
  display: block;
  margin-bottom: 20rpx;
  color: #176b52;
  font-size: 25rpx;
  font-weight: 750;
}
.content { display: block; font-size: 29rpx; line-height: 1.7; }
.suggestion,
.dimension {
  display: flex;
  justify-content: space-between;
  gap: 24rpx;
  padding: 22rpx 0;
  border-top: 1rpx solid #e7eeeb;
}
.suggestion:first-of-type { margin-top: 22rpx; }
.suggestion > text { color: #2e9a76; font-weight: 800; }
.suggestion > view { flex: 1; }
.dimension text:last-child { color: #176b52; font-weight: 750; }
</style>
