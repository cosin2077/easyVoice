<template>
  <!-- Footer Section -->
  <footer class="footer">
    <div class="footer-links">
      <router-link class="footer-icon" to="/"><Home /> 首页</router-link>
      <router-link class="footer-icon" to="/generate"><Mic /> 生成语音</router-link>
      <router-link class="footer-icon" to="/about"><Info /> 关于</router-link>
      <el-link
        class="footer-icon"
        href="https://github.com/cosin2077/easyVoice/issues"
        target="_blank"
        ><Mail /> 联系</el-link
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

<style scoped>
/* Footer */
.footer {
  text-align: center;
  padding: 20px 0;
  font-size: 14px;
  color: #666;
}
.footer-icon {
  /* width: 16px;
  height: 16px; */
  margin-right: 26px;
}
.footer a {
  color: #007aff;
  text-decoration: none;
}
</style>
