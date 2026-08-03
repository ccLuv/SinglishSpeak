<template>
  <view class="page">
    <view class="summary">
      <text class="section-title">训练轨迹</text>
      <text class="muted">共 {{ list.length }} 次练习</text>
    </view>

    <view v-if="!list.length && !loading" class="empty card">
      还没有训练记录。
    </view>

    <view
      v-for="item in list"
      :key="item.id"
      class="item card"
      hover-class="item-active"
      @click="openDetail(item)"
    >
      <view class="top">
        <text class="tag">{{ item.type }}</text>
        <view class="score-wrap">
          <text class="score">{{ getScore(item) }}</text>
          <text class="arrow">›</text>
        </view>
      </view>
      <text class="source">{{ item.sourceText }}</text>
      <text class="feedback">{{ item.feedback || "暂无文字反馈" }}</text>
      <text class="time">{{ item.time }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { request } from "../../utils/api";

const list = ref([]);
const loading = ref(true);

const getScore = (item) => {
  if (item.score !== undefined && item.score !== null) return item.score;
  if (!item.score_accuracy) return "—";
  return Math.round(
    (item.score_accuracy +
      item.score_fluency +
      item.score_local +
      item.score_register) *
      5,
  );
};

function openDetail(item) {
  uni.setStorageSync("selectedHistory", item);
  uni.navigateTo({ url: "/pages/history-detail/history-detail" });
}

onShow(async () => {
  loading.value = true;
  try {
    list.value = await request("/api/getHistory");
  } catch (error) {
    uni.showToast({ title: error.message, icon: "none" });
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.summary,
.top,
.score-wrap {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.summary { margin: 12rpx 0 28rpx; }
.item {
  margin-bottom: 22rpx;
  padding: 30rpx;
  transition: transform 0.15s, background 0.15s;
}
.item-active {
  background: #f0f7f4;
  transform: scale(0.99);
}
.tag {
  padding: 8rpx 18rpx;
  border-radius: 24rpx;
  background: #e5f2ed;
  color: #176b52;
}
.score {
  color: #176b52;
  font-size: 44rpx;
  font-weight: 800;
}
.arrow {
  margin-left: 16rpx;
  color: #8da099;
  font-size: 46rpx;
}
.source {
  display: block;
  overflow: hidden;
  margin: 22rpx 0 12rpx;
  font-size: 27rpx;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.feedback { display: block; color: #677772; }
.time {
  display: block;
  margin-top: 20rpx;
  color: #a0aaa7;
  font-size: 20rpx;
}
.empty { padding: 70rpx; text-align: center; }
</style>
