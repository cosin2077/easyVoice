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
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 0 20px;
  font-family: "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif;
  color: #333;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* Header */
.header {
  text-align: center;
  padding: 60px 0;
  position: relative;
}
.title {
  font-size: 72px;
  font-weight: 700;
  margin-bottom: 10px;
  color: #1a1a1a;
}
.subtitle {
  font-size: 24px;
  color: #666;
  margin-bottom: 30px;
}
.header-actions .el-button {
  margin: 0 10px;
  padding: 12px 24px;
  font-size: 16px;
}
.icon {
  width: 18px;
  height: 18px;
  margin-right: 6px;
  vertical-align: middle;
}

/* Info Section */
.info {
  max-width: 1200px;
  margin: 0 auto 60px;
}
.section-title {
  font-size: 32px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 40px;
  color: #1a1a1a;
}
.info-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  grid-auto-flow: column;
  gap: 20px;
  margin-bottom: 40px;
}
.info-card {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  padding: 20px;
  transition: transform 0.3s ease;
}
.info-card:hover {
  transform: translateY(-5px);
}
.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
.info-icon {
  width: 24px;
  height: 24px;
  margin-right: 10px;
  color: #007aff;
}
.info-card h3 {
  font-size: 20px;
  color: #1a1a1a;
}
.info-card p {
  font-size: 14px;
  color: #666;
}
.cta {
  text-align: center;
}
.cta p {
  font-size: 18px;
  color: #444;
  margin-bottom: 20px;
}
.cta h3 {
  font-size: 24px;
  color: #1a1a1a;
}

/* Responsive Design */
@media (max-width: 768px) {
  .title {
    font-size: 48px;
  }
  .subtitle {
    font-size: 18px;
  }
  .section-title {
    font-size: 24px;
  }
  .header-actions .el-button {
    padding: 10px 20px;
    font-size: 14px;
  }
  .info-cards {
    grid-template-columns: 1fr;
    grid-auto-flow: row;
  }
}
</style>
