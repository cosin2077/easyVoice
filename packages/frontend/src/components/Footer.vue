<template>
  <!-- Footer Section -->
  <footer class="footer">
    <div class="footer-links">
      <router-link class="footer-icon" to="/"><Home :size="14" :stroke-width="1.75" /> 首页</router-link>
      <router-link class="footer-icon" to="/generate"><Mic :size="14" :stroke-width="1.75" /> 生成语音</router-link>
      <router-link class="footer-icon" to="/about"><Info :size="14" :stroke-width="1.75" /> 关于</router-link>
      <el-link
        class="footer-icon"
        href="https://github.com/cosin2077/easyVoice/issues"
        target="_blank"
        ><Mail :size="14" :stroke-width="1.75" /> 联系</el-link
      >
    </div>
    <p>
      如有任何问题或建议，欢迎通过
      <el-link
        href="https://github.com/cosin2077/easyVoice/issues"
        target="_blank"
      >
        GitHub Issues
      </el-link>
      联系。
    </p>
  </footer>
</template>

<script setup lang="ts">
import { Home, Mic, Info, Mail } from 'lucide-vue-next'
</script>

<style scoped lang="less">
.footer {
  text-align: center;
  padding: 28px var(--ev-gutter) calc(32px + var(--ev-safe-bottom));
  font-size: 13px;
  color: var(--ev-text-2);
  line-height: 1.6;
}
.footer p {
  margin: 4px 0 0;
  color: var(--ev-text-2);
  font-size: 13px;
}
.footer-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px 20px;
  margin-bottom: 6px;
}
.footer-icon {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 32px;
  color: var(--ev-text);
  font-size: 13px;
}
.footer a {
  color: var(--ev-accent);
  text-decoration: none;
}
@media @bp-touch {
  .footer-icon {
    min-height: var(--ev-touch);
    padding: 0 6px;
  }
}
</style>
