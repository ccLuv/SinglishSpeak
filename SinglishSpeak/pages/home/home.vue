<template>
<view class="page">
<view class="hero">
<view>
<text class="hello">你好，{{username||'学习者'}}</text>
<text class="muted sub">开始今天的专业口译训练</text>
</view>
<view class="avatar" @click="go('/pages/profile/profile')">{{(username||'S').slice(0,1)}}</view>
</view>
<view class="progress card">
<text>累计训练</text>
<text class="count">{{count}} 次</text>
</view>
<view class="row">
<text class="section-title">选择训练场景</text>
<text class="link" @click="go('/pages/history/history')">历史记录 ›</text>
</view>
<view class="grid">
<view v-for="(item,i) in types" :key="item.code" class="type card" @click="start(item)">
<text class="icon">{{icons[i%5]}}</text>
<text class="type-name">{{ getTypeName(item) }}</text>
<text class="muted">开始专项练习</text>
</view>
</view>
</view>
</template>
<script setup>import{ref,onMounted}from'vue';
import{request}from'../../utils/api';
const username=ref(uni.getStorageSync('username')),types=ref([]),count=ref(0),icons=['🏛️','📈','🎓','⚖️','🤝'];
const typeNames = {
  government: "政府与政策",
  business: "商务与投资",
  education: "学校与教育",
  legal: "法律与机构参访",
  community: "社区与公共服务",
};
const getTypeName = (item) => typeNames[item.code] || item.name || "综合训练";
const go=url=>uni.navigateTo({url});
const start = (item) => {
  uni.navigateTo({
    url:
      "/pages/training/training?code=" +
      item.code +
      "&name=" +
      getTypeName(item),
  });
};
onMounted(async()=>{try{types.value=await request('/api/getTypeList');
count.value=(await request('/api/getHistory')).length}catch(e){uni.showToast({title:e.message,icon:'none'})}})</script>
<style scoped>.hero{display:flex;
justify-content:space-between;
align-items:center;
padding:30rpx 4rpx}
.hello{display:block;
font-size:42rpx;
font-weight:800}
.sub{display:block;
margin-top:8rpx}
.avatar{width:84rpx;
height:84rpx;
border-radius:50%;
background:#d8ede5;
color:#176b52;
text-align:center;
line-height:84rpx;
font-size:34rpx;
font-weight:800}
.progress{padding:36rpx;
background:#176b52;
color:#fff}
.count{display:block;
font-size:54rpx;
font-weight:800;
margin-top:10rpx}
.row{display:flex;
justify-content:space-between;
align-items:center;
margin:48rpx 0 24rpx}
.link{color:#176b52}
.grid{display:grid;
grid-template-columns:1fr 1fr;
gap:22rpx}
.type{padding:30rpx;
min-height:205rpx}
.icon{display:block;
font-size:46rpx;
margin-bottom:24rpx}
.type-name{display:block;
font-weight:700;
font-size:28rpx;
margin-bottom:8rpx}
</style>
