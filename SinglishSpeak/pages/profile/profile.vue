<template>
<view class="page">
<view class="profile card">
<view class="avatar">{{(username||'S').slice(0,1)}}</view>
<text class="name">{{username||'学习者'}}</text>
<text class="muted">口译训练学习者</text>
</view>
<view class="card form">
<text class="title">修改用户名</text>
<input v-model.trim="newUsername" class="field" placeholder="新用户名"/>
<button class="ghost" @click="changeUsername">确认修改</button>
</view>
<view class="card form">
<text class="title">修改密码</text>
<input v-model="oldPassword" class="field" password placeholder="原密码"/>
<input v-model="newPassword" class="field" password placeholder="新密码"/>
<button class="ghost" @click="changePassword">确认修改</button>
</view>
<button class="logout" @click="logout">退出登录</button>
</view>
</template>
<script setup>import{ref}from'vue';
import{request}from'../../utils/api';
const username=ref(uni.getStorageSync('username')),newUsername=ref(''),oldPassword=ref(''),newPassword=ref('');
async function changeUsername(){try{await request('/api/changeUsername',{method:'POST',data:{newUsername:newUsername.value}});
username.value=newUsername.value;
uni.setStorageSync('username',username.value);
newUsername.value='';
uni.showToast({title:'修改成功'})}catch(e){uni.showToast({title:e.message,icon:'none'})}}async function changePassword(){try{await request('/api/changePassword',{method:'POST',data:{oldPassword:oldPassword.value,newPassword:newPassword.value}});
oldPassword.value='';
newPassword.value='';
uni.showToast({title:'修改成功'})}catch(e){uni.showToast({title:e.message,icon:'none'})}}async function logout(){try{await request('/api/logout',{method:'POST'})}catch{}uni.removeStorageSync('username');
uni.reLaunch({url:'/pages/login/login'})}</script>
<style scoped>.profile{display:flex;
flex-direction:column;
align-items:center;
padding:48rpx;
margin:10rpx 0 26rpx}
.avatar{width:110rpx;
height:110rpx;
border-radius:50%;
background:#176b52;
color:#fff;
display:flex;
align-items:center;
justify-content:center;
font-size:48rpx;
font-weight:800}
.name{font-size:36rpx;
font-weight:750;
margin:20rpx 0 8rpx}
.form{padding:32rpx;
margin-bottom:24rpx}
.title{display:block;
font-weight:700;
margin-bottom:22rpx}
.field{height:86rpx;
background:#f4f7f6;
border-radius:16rpx;
padding:0 24rpx;
margin-bottom:18rpx}
.logout{margin-top:32rpx;
background:#fff;
color:#c34848;
border-radius:42rpx}
</style>
