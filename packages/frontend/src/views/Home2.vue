<template>
  <div class="home-container">
    <!-- Header Section -->
    <header class="header">
      <h1 class="title">EasyVoice</h1>
      <p class="subtitle">智能小说转语音解决方案</p>
      <div class="header-actions">
        <el-button type="primary" round @click="goToGenerate">
          <Zap />
          立即体验
        </el-button>
        <el-button plain round @click="goToGitHub">
          <Github />
          GitHub
        </el-button>
      </div>
    </header>

    <!-- Features Section -->
    <section class="features">
      <h2 class="section-title">产品特点</h2>
      <div class="feature-cards">
        <el-card class="feature-card" shadow="hover">
          <h3>超长小说一键转换</h3>
          <p>支持处理大型文本文件，轻松将超长小说转换为语音</p>
        </el-card>
        <el-card class="feature-card" shadow="hover">
          <h3>多角色配音</h3>
          <p>支持多种语言、性别和角色特性的语音，为不同角色赋予独特声音</p>
        </el-card>
        <el-card class="feature-card" shadow="hover">
          <h3>语音试听</h3>
          <p>生成前可试听语音效果，确保最终结果符合预期</p>
        </el-card>
        <el-card class="feature-card" shadow="hover">
          <h3>自定义设置</h3>
          <p>支持自定义语速、音调，以及接入自定义大模型和TTS服务</p>
        </el-card>
      </div>
      <div class="cta">
        <p>
          EasyVoice，将您的文本转换为自然流畅的语音。无需复杂设置，只需简单几步，即可获得专业级语音效果。
        </p>
        <!-- <el-button type="primary" round size="large" @click="goToGenerate">立即体验</el-button> -->
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="faq">
      <h2 class="section-title">常见问题</h2>
      <el-collapse accordion>
        <el-collapse-item title="如何自定义语音角色？">
          <p>
            在生成页面，您可以选择不同的语音角色，并调整语速、音调等参数，也可以通过
            AI 智能推荐最适合的配置。
          </p>
        </el-collapse-item>
        <el-collapse-item title="如何部署自己的 EasyVoice 实例？">
          <p>
            我们提供了详细的部署文档，您可以按照文档指引，使用 Docker
            快速部署自己的 EasyVoice 实例。
          </p>
        </el-collapse-item>
      </el-collapse>
    </section>

    <!-- Footer Section -->
    <footer v-if="false" class="footer">
      <div class="footer-links">
        <a href="#">首页</a>
        <a @click="goToGenerate">生成语音</a>
        <a href="#">关于我们</a>
        <a href="#">联系我们</a>
      </div>
      <p>
        如有任何问题或建议，欢迎通过
        <a href="https://github.com/cosin2077/easyVoice/issues" target="_blank"
          >GitHub Issues</a
        >
        与我们联系。
      </p>
      <p>© 2025 EasyVoice. 保留所有权利。</p>
    </footer>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { Promotion } from "@element-plus/icons-vue";
import { Github, Zap } from "lucide-vue-next";
const router = useRouter();

const goToGenerate = () => {
  router.push("/generate");
};

const goToGitHub = () => {
  window.open("https://github.com/cosin2077/easyVoice", "_blank");
};
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 0 20px;
  font-family: "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif;
  color: #333;
}

/* Header */
.header {
  text-align: center;
  padding: 60px 0;
}
.title {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 10px;
  color: #1a1a1a;
}
.subtitle {
  font-size: 20px;
  color: #666;
  margin-bottom: 30px;
}
.header-actions .el-button {
  margin: 0 10px;
  padding: 12px 24px;
  font-size: 16px;
}

/* Features */
.features {
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
.feature-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}
.feature-card {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  padding: 20px;
  transition: transform 0.3s ease;
}
.feature-card:hover {
  transform: translateY(-5px);
}
.feature-card h3 {
  font-size: 20px;
  margin-bottom: 10px;
  color: #1a1a1a;
}
.feature-card p {
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

/* FAQ */
.faq {
  max-width: 800px;
  margin: 0 auto 60px;
}
.el-collapse {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  padding: 10px;
}
.el-collapse-item__header {
  font-size: 16px;
  font-weight: 500;
  padding: 10px;
}
.el-collapse-item__content {
  font-size: 14px;
  color: #666;
  padding: 10px 20px;
}

/* Footer */
.footer {
  text-align: center;
  padding: 40px 0;
  font-size: 14px;
  color: #666;
}
.footer-links {
  margin-bottom: 20px;
}
.footer-links a {
  margin: 0 15px;
  color: #1a1a1a;
  text-decoration: none;
  transition: color 0.3s ease;
}
.footer-links a:hover {
  color: #007aff;
}
.footer a {
  color: #007aff;
  text-decoration: none;
}

/* Responsive Design */
@media (max-width: 768px) {
  .title {
    font-size: 36px;
  }
  .subtitle {
    font-size: 16px;
  }
  .section-title {
    font-size: 24px;
  }
  .header-actions .el-button {
    padding: 10px 20px;
    font-size: 14px;
  }
  .feature-cards {
    grid-template-columns: 1fr;
  }
}
</style>
