<template>
  <div class="about-container">
    <!-- Header Section -->
    <header class="header">
      <h1 class="title">关于 EasyVoice</h1>
      <p class="subtitle">智能小说转语音解决方案</p>
    </header>

    <!-- Intro Section -->
    <section class="intro">
      <div class="intro-content">
        <el-icon :size="40" class="intro-icon"><ChatDotRound /></el-icon>
        <h2>项目简介</h2>
        <p>
          EasyVoice
          是一个开源工具，致力于将文本轻松转换为自然流畅的语音输出，特别适合小说和长篇文章的有声化需求。
        </p>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features">
      <h2 class="section-title">核心功能</h2>
      <div class="feature-list">
        <div class="feature-item">
          <el-icon :size="30"><Reading /></el-icon>
          <h3>文本转语音</h3>
          <p>一键将大型文本转换为语音</p>
        </div>
        <div class="feature-item">
          <el-icon :size="30"><Microphone /></el-icon>
          <h3>角色配音</h3>
          <p>多种声音特性，赋予角色独特个性</p>
        </div>
        <div class="feature-item">
          <el-icon :size="30"><Setting /></el-icon>
          <h3>自定义设置</h3>
          <p>自由调整语速与音调</p>
        </div>
      </div>
    </section>

    <!-- Team Section -->
    <section class="team">
      <h2 class="section-title">关于</h2>
      <div class="team-content">
        <el-icon :size="40" class="team-icon"><User /></el-icon>
        <p>EasyVoice 是一个实验性的项目，旨在提供简单高效的语音转换体验。</p>
        <p>喜欢我就给我Star吧</p>
        <div class="links">
          <el-button round plain @click="goToAuthorGitHub">
            <el-icon><Github /></el-icon> cosinco2077
          </el-button>
          <el-button type="primary" round plain @click="goToProjectGitHub">
            <el-icon><Github /></el-icon> EasyVoice
          </el-button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import {
  ChatDotRound,
  Reading,
  Microphone,
  Setting,
  User,
} from "@element-plus/icons-vue";
import { Github } from "lucide-vue-next";

const goToAuthorGitHub = () => {
  window.open("https://github.com/cosin2077", "_blank");
};

const goToProjectGitHub = () => {
  window.open("https://github.com/cosin2077/easyVoice", "_blank");
};
</script>

<style scoped lang="less">
.about-container {
  max-width: 1080px;
  margin: 0 auto;
}

.header {
  text-align: center;
  padding: clamp(36px, 8vw, 60px) 0 clamp(24px, 5vw, 48px);
}
.title {
  font-size: clamp(30px, 6vw, 48px);
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 10px;
  color: var(--ev-text);
}
.subtitle {
  margin: 0;
  font-size: clamp(15px, 2.4vw, 20px);
  color: #666;
}

.intro,
.features,
.team {
  margin: 0 auto clamp(32px, 7vw, 60px);
}
.intro-content,
.team-content {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  padding: clamp(20px, 4vw, 32px);
  text-align: center;
  backdrop-filter: blur(10px);
}
.intro-icon,
.team-icon,
.feature-item .el-icon {
  color: var(--ev-accent);
  margin-bottom: 12px;
}
.intro-content h2 {
  font-size: clamp(20px, 3vw, 24px);
  margin: 0 0 12px;
  color: var(--ev-text);
}
.intro-content p,
.team-content p {
  margin: 0 0 16px;
  font-size: 15px;
  line-height: 1.7;
  color: #555;
}
.intro-content p:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: clamp(22px, 4vw, 32px);
  font-weight: 600;
  letter-spacing: -0.01em;
  text-align: center;
  margin: 0 0 clamp(20px, 4vw, 40px);
  color: var(--ev-text);
}
.feature-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
  gap: clamp(12px, 2vw, 20px);
  text-align: center;
}
.feature-item {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 20px;
  transition: transform 0.3s ease;
}
@media @bp-hover {
  .feature-item:hover {
    transform: translateY(-4px);
  }
}
.feature-item h3 {
  font-size: 17px;
  margin: 0 0 8px;
  color: var(--ev-text);
}
.feature-item p {
  margin: 0;
  font-size: 14px;
  color: #555;
}

.links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}
.links .el-button {
  margin: 0;
  height: 44px;
  padding: 0 20px;
}
.links .el-button .el-icon {
  margin-right: 6px;
}
</style>
