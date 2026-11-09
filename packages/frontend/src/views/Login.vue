<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="title">登录 EasyVoice</h1>
      <p class="hint">请使用服务器配置的用户名和密码登录后再生成语音。</p>
      <el-form class="form" @submit.prevent="onSubmit">
        <label class="field">
          <span>用户名</span>
          <el-input v-model="username" name="username" autocomplete="username" size="large" />
        </label>
        <label class="field">
          <span>密码</span>
          <el-input
            v-model="password"
            name="password"
            type="password"
            show-password
            autocomplete="current-password"
            size="large"
          />
        </label>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <el-button type="primary" native-type="submit" size="large" :loading="loading" class="submit">
          登录
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

async function onSubmit() {
  error.value = ''
  if (!username.value.trim() || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }
  loading.value = true
  try {
    await auth.login(username.value.trim(), password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/generate'
    await router.replace(redirect.startsWith('/') ? redirect : '/generate')
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="less">
.login-page {
  max-width: var(--ev-page-max);
  margin: 0 auto;
  min-height: calc(100dvh - var(--ev-header-h) - 120px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 0 48px;
}
.login-card {
  width: min(100%, 400px);
  padding: 28px 24px 24px;
  background: var(--ev-panel);
  border: 1px solid var(--ev-border);
  border-radius: var(--ev-radius);
  box-shadow: 0 8px 30px rgba(20, 20, 30, 0.06);
}
.title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.hint {
  margin: 0 0 24px;
  color: var(--ev-muted);
  font-size: 14px;
  line-height: 1.6;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--ev-text-2);
}
.field :deep(.el-input__wrapper) {
  min-height: var(--ev-touch);
  padding: 4px 12px;
}
.field :deep(.el-input__inner) {
  font-size: 16px;
}
.error {
  margin: 0;
  color: var(--ev-danger);
  font-size: 13px;
}
.submit {
  width: 100%;
  min-height: var(--ev-touch);
  margin-top: 4px;
}
@media @bp-phone {
  .login-page {
    align-items: flex-start;
    padding-top: 24px;
  }
  .login-card {
    padding: 24px 18px;
    box-shadow: none;
  }
}
</style>
