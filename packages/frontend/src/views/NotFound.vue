<template>
  <div class="not-found-container">
    <!-- Header Section -->
    <header class="header">
      <h1 class="title">404</h1>
      <p class="subtitle">哎呀！页面走丢了</p>
      <div class="header-actions">
        <el-button type="primary" round @click="goToHome">
          <Home class="icon" /> 返回首页
        </el-button>
        <el-button plain round @click="goToGitHub">
          <Github class="icon" /> GitHub
        </el-button>
      </div>
    </header>

    <!-- Info Section -->
    <section class="info">
      <h2 class="section-title">可能的原因</h2>
      <div class="info-cards">
        <el-card class="info-card" shadow="hover">
          <div class="card-header">
            <Info class="info-icon" />
            <h3>地址输入错误</h3>
          </div>
          <p>您可能输入了一个不存在的页面地址，请检查 URL 是否正确。</p>
        </el-card>
        <el-card class="info-card" shadow="hover">
          <div class="card-header">
            <BookOpen class="info-icon" />
            <h3>页面已移除</h3>
          </div>
          <p>该页面可能已被删除或迁移到其他位置。</p>
        </el-card>
        <el-card class="info-card" shadow="hover">
          <div class="card-header">
            <Mail class="info-icon" />
            <h3>需要帮助？</h3>
          </div>
          <p>如果您仍需协助，请联系我们或查看 GitHub 文档。</p>
        </el-card>
      </div>
      <div class="cta">
        <p>别担心，EasyVoice 依然为您提供智能语音解决方案！</p>
        <h3>
          <router-link to="/">点我</router-link>
          带你回到正轨！
        </h3>
      </div>
    </section>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { Home, Github, Info, BookOpen, Mail } from "lucide-vue-next";

const router = useRouter();

const goToHome = () => {
  router.push("/");
};

const goToGitHub = () => {
  window.open("https://github.com/cosin2077/easyVoice", "_blank");
};
</script>

<style scoped lang="less">
.not-found-container {
  max-width: 1080px;
  margin: 0 auto;
}

.header {
  text-align: center;
  padding: clamp(40px, 9vw, 64px) 0 clamp(28px, 6vw, 48px);
}
.title {
  font-size: clamp(56px, 12vw, 72px);
  font-weight: 700;
  letter-spacing: -0.03em;
  margin: 0 0 8px;
  color: var(--ev-text);
}
.subtitle {
  font-size: clamp(17px, 3vw, 24px);
  color: #666;
  margin: 0 0 24px;
}
.header-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
}
.header-actions .el-button {
  margin: 0;
  height: 44px;
  padding: 0 24px;
  font-size: 15px;
}
.icon {
  width: 18px;
  height: 18px;
  margin-right: 6px;
  vertical-align: middle;
}

.info {
  margin: 0 auto clamp(40px, 8vw, 60px);
}
.section-title {
  font-size: clamp(22px, 4vw, 32px);
  font-weight: 600;
  text-align: center;
  margin: 0 0 clamp(20px, 4vw, 40px);
  color: var(--ev-text);
}
.info-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr));
  gap: clamp(12px, 2vw, 20px);
  margin-bottom: clamp(24px, 5vw, 40px);
}
.info-card {
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  transition: transform 0.3s ease;
}
.info-card :deep(.el-card__body) {
  padding: clamp(16px, 3vw, 24px);
}
@media @bp-hover {
  .info-card:hover {
    transform: translateY(-4px);
  }
}
.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
.card-header h3 {
  margin: 0;
}
.info-icon {
  flex: none;
  width: 22px;
  height: 22px;
  margin-right: 10px;
  color: var(--ev-accent);
}
.info-card h3 {
  font-size: 17px;
  color: var(--ev-text);
}
.info-card p {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: #555;
}
.cta {
  text-align: center;
}
.cta p {
  font-size: 15px;
  color: var(--ev-text-2);
  margin: 0 0 12px;
}
.cta h3 {
  font-size: clamp(17px, 3vw, 22px);
  color: var(--ev-text);
}
.cta h3 a {
  display: inline-flex;
  align-items: center;
  min-height: var(--ev-touch);
}
</style>
