<template>
<view class="login">
<view class="brand">
<view class="logo">S</view>
<text class="name">SinglishSpeak</text>
<text class="muted">新加坡语境 · 中英口译训练</text>
</view>
<view class="form card">
<text class="title">欢迎回来</text>
<input v-model.trim="username" class="field" placeholder="用户名"/>
<input v-model="password" class="field" password placeholder="密码"/>
<button class="primary" :loading="loading" @click="login">登录</button>
</view>
</view>
</template>
<script setup>import{ref}from'vue';
import{request}from'../../utils/api';
const username=ref(''),password=ref(''),loading=ref(false);
async function login(){if(!username.value||!password.value)return uni.showToast({title:'请输入用户名和密码',icon:'none'});
loading.value=true;
try{await request('/api/login',{method:'POST',data:{username:username.value,password:password.value}});
uni.setStorageSync('username',username.value);
uni.reLaunch({url:'/pages/home/home'})}catch(e){uni.showToast({title:e.message,icon:'none'})}finally{loading.value=false}}</script>
<style scoped>.login{min-height:100vh;
padding:130rpx 48rpx;
background:linear-gradient(160deg,#e3f3ed,#fff)}
.brand{display:flex;
flex-direction:column;
align-items:center;
margin-bottom:64rpx}
.logo{width:112rpx;
height:112rpx;
border-radius:32rpx;
background:#176b52;
color:#fff;
text-align:center;
line-height:112rpx;
font-size:64rpx;
font-weight:800}
.name{font-size:52rpx;
font-weight:800;
margin:25rpx 0 10rpx}
.form{padding:48rpx 36rpx}
.title{display:block;
font-size:38rpx;
font-weight:750;
margin-bottom:34rpx}
.field{height:94rpx;
background:#f4f7f6;
border:1rpx solid #dce7e3;
border-radius:18rpx;
padding:0 28rpx;
margin-bottom:22rpx}
.primary{margin-top:12rpx}
</style>
