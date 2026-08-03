<template>
<view class="page">
<view class="score-card card">
<text class="muted">本次综合得分</text>
<view class="score">{{data.score||0}}<text>/100</text>
</view>
<text class="level">{{level}}</text>
</view>
<view class="card detail">
<text class="section-title">AI 反馈</text>
<text class="feedback">{{data.feedback||'暂无反馈'}}</text>
<view v-for="(s,i) in data.suggestions||[]" :key="i" class="suggest">
<text>0{{i+1}}</text>
<view>{{s}}</view>
</view>
</view>
<view class="notice">当前后端为演示评分；接入真实 ASR 后将展示转写、遗漏、数字与术语错误。</view>
<button class="primary" :loading="saving" @click="save">保存训练记录</button>
<button class="ghost" @click="again">再练一次</button>
</view>
</template>
<script setup>import{ref,computed}from'vue';
import{request}from'../../utils/api';
const data=ref(uni.getStorageSync('latestEvaluation')||{}),saving=ref(false);
const level=computed(()=>data.value.score>=90?'优秀':data.value.score>=75?'表现良好':'继续练习');
async function save(){saving.value=true;
try{await request('/api/saveHistory',{method:'POST',data:{type:data.value.type,sourceText:data.value.sourceText,audioPath:data.value.audioPath,score:data.value.score,feedback:data.value.feedback,suggestions:data.value.suggestions}});
uni.showToast({title:'已保存'});
setTimeout(()=>uni.reLaunch({url:'/pages/home/home'}),700)}catch(e){uni.showToast({title:e.message,icon:'none'})}finally{saving.value=false}}function again(){uni.reLaunch({url:'/pages/home/home'})}</script>
<style scoped>.score-card{text-align:center;
padding:52rpx;
margin:10rpx 0 28rpx}
.score{font-size:108rpx;
font-weight:850;
color:#176b52;
margin:12rpx}
.score text{font-size:28rpx;
color:#9aa5a1}
.level{padding:10rpx 24rpx;
border-radius:30rpx;
background:#e1f2eb;
color:#176b52}
.detail{padding:36rpx;
margin-bottom:26rpx}
.feedback{display:block;
font-size:29rpx;
line-height:1.65;
margin:26rpx 0}
.suggest{display:flex;
gap:22rpx;
padding:24rpx 0;
border-top:1rpx solid #e7eeeb}
.suggest text{color:#2e9a76;
font-weight:800}
.notice{background:#fff5dd;
color:#80652d;
padding:24rpx;
border-radius:18rpx;
font-size:22rpx;
margin-bottom:28rpx}
.ghost{margin-top:20rpx}
</style>
