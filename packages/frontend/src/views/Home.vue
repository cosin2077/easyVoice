<template>
  <div class="home-container">
    <!-- Header Section -->
    <header class="header">
      <h1 class="title">EasyVoice</h1>
      <p class="subtitle">智能小说转语音解决方案</p>
      <div class="header-actions">
        <el-button type="primary" round @click="triggerConfettiAndGo">
          <Sparkles class="icon" /> 立即体验
          <ConfettiExplosion
            v-if="confettiActive"
            :duration="2500"
            :stageHeight="500"
          />
        </el-button>
        <el-button plain round @click="goToGitHub">
          <Github class="icon" /> GitHub
        </el-button>
      </div>
    </header>

    <!-- Features Section -->
    <section class="features">
      <h2 class="section-title">产品特点</h2>
      <div class="feature-cards">
        <el-card class="feature-card" shadow="hover">
          <div class="card-header">
            <FileText class="feature-icon" />
            <h3>超长小说一键转换</h3>
          </div>
          <p>支持处理大型文本文件，轻松将超长小说转换为语音</p>
        </el-card>
        <el-card class="feature-card" shadow="hover">
          <div class="card-header">
            <Users class="feature-icon" />
            <h3>多角色配音</h3>
          </div>
          <p>支持多种语言、性别和角色特性的语音，为不同角色赋予独特声音</p>
        </el-card>
        <el-card class="feature-card" shadow="hover">
          <div class="card-header">
            <Ear class="feature-icon" />
            <h3>语音试听</h3>
          </div>
          <p>生成前可试听语音效果，确保最终结果符合预期</p>
        </el-card>
        <el-card class="feature-card" shadow="hover">
          <div class="card-header">
            <Settings class="feature-icon" />
            <h3>自定义设置</h3>
          </div>
          <p>支持自定义语速、音调，以及接入自定义大模型和TTS服务</p>
        </el-card>
      </div>
      <div class="cta">
        <p>
          EasyVoice，将您的文本转换为自然流畅的语音。无需复杂设置，只需简单几步，即可获得专业级语音效果。
        </p>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="faq">
      <h2 class="section-title">常见问题/FAQ</h2>
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
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

import {
  BookOpen,
  Github,
  FileText,
  Users,
  Ear,
  Settings,
  Sparkles,
  Home,
  Mic,
  Info,
  Mail,
} from "lucide-vue-next";
import ConfettiExplosion from "vue-confetti-explosion";

const router = useRouter();
const confettiActive = ref(false);
const fadeout = ref(false);

const goToGenerate = () => {
  router.push("/generate");
};

const goToGitHub = () => {
  window.open("https://github.com/cosin2077/easyVoice", "_blank");
};

const triggerConfettiAndGo = () => {
  confettiActive.value = !confettiActive.value;
  setTimeout(() => {
    goToGenerate();
  }, 800);
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
  position: relative;
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
.icon {
  width: 18px;
  height: 18px;
  margin-right: 6px;
  vertical-align: middle;
}

/* Confetti Animation */
.confetti {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
}
.confetti::before,
.confetti::after {
  content: "";
  position: absolute;
  width: 10px;
  height: 10px;
  background: #ff6b6b;
  border-radius: 50%;
  animation: confetti-fall 0.8s ease-out infinite;
}
.confetti::before {
  left: 40%;
  background: #4ecdc4;
  animation-delay: 0.2s;
}
.confetti::after {
  left: 60%;
  background: #ffe66d;
}
@keyframes confetti-fall {
  0% {
    transform: translateY(-100%) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
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
.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
.feature-icon {
  width: 24px;
  height: 24px;
  margin-right: 10px;
  color: #007aff;
}
.feature-card h3 {
  font-size: 20px;
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
