<template>
  <div class="home-container">
    <!-- Header Section -->
    <header class="header">
      <h1 class="title">EasyVoice</h1>
      <p class="subtitle">小说转语音智能解决方案</p>
      <HomeAudio />
      <div class="header-actions">
        <el-button type="primary" round @click="triggerConfettiAndGo">
          <Sparkles class="icon" /> 立即体验
        </el-button>
        <el-button plain round @click="goToGitHub"> <Github class="icon" /> GitHub </el-button>
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
        <h3>仅需一步，您就能部署自己的 EasyVoice 服务！</h3>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="faq">
      <h2 class="section-title">常见问题/FAQ</h2>
      <el-collapse accordion>
        <el-collapse-item title="如何自定义语音角色？">
          <p>
            在生成页面，您可以选择不同的语音角色，并调整语速、音调等参数，也可以通过 AI
            智能推荐最适合的配置。
          </p>
        </el-collapse-item>
        <el-collapse-item title="如何部署自己的 EasyVoice 实例？">
          <p>
            我们提供了详细的部署文档，您可以按照文档指引，使用 Docker 或者 Node.js 快速部署自己的
            EasyVoice 实例。
          </p>
        </el-collapse-item>
        <el-collapse-item title="为什么我的AI配音效果不好？">
          <p>
            AI
            推荐配音是通过大模型来决定不同的段落的配音参数，<strong>大模型的能力直接影响配音结果</strong>，你可以尝试更换不同的大模型，或者是用
            Edge-TTS 选择固定的声音配音。
          </p>
        </el-collapse-item>
        <el-collapse-item title="长文本速度太慢？">
          <p>
            请首先确认网络状况，Edge-TTS 依赖网络请求生成音频。 AI
            推荐配音需要把输入的文本分段、然后让 AI
            分析、推荐每一分段的配音参数，最后再生成音频、拼接。速度会比直接用
            Edge-TTS慢。你可以更换相应更快的大模型，或者尝试调节`.env`文件的 Edge-TTS
            的并发参数：EDGE_API_LIMIT为更大的值(10
            以下)，<strong>注意并发太高可能会有限制</strong>。
          </p>
        </el-collapse-item>
      </el-collapse>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { celebrate } from '@/utils/celebrate'
import HomeAudio from '@/components/HomeAudio.vue'
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
} from 'lucide-vue-next'

const router = useRouter()
const fadeout = ref(false)

const goToGenerate = () => {
  router.push('/generate')
}

const goToGitHub = () => {
  window.open('https://github.com/cosin2077/easyVoice', '_blank')
}

const triggerConfettiAndGo = (event) => {
  celebrate(event.currentTarget, 100)
  setTimeout(() => {
    goToGenerate()
  }, 400)
}
</script>

<style scoped lang="less">
.home-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* Hero */
.header {
  text-align: center;
  padding: clamp(36px, 8vw, 64px) 0 clamp(28px, 6vw, 56px);
  position: relative;
}
.title {
  font-size: clamp(34px, 7vw, 48px);
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 10px;
  color: var(--ev-text);
}
.subtitle {
  font-size: clamp(15px, 2.4vw, 20px);
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

/* Features */
.features {
  margin: 0 auto clamp(40px, 8vw, 60px);
}
.section-title {
  font-size: clamp(22px, 4vw, 32px);
  font-weight: 600;
  letter-spacing: -0.01em;
  text-align: center;
  margin: 0 0 clamp(20px, 4vw, 40px);
  color: var(--ev-text);
}
.feature-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr));
  gap: clamp(12px, 2vw, 20px);
  margin-bottom: clamp(24px, 5vw, 40px);
}
.feature-card {
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  transition: transform 0.3s ease;
}
.feature-card :deep(.el-card__body) {
  padding: clamp(16px, 3vw, 24px);
}
@media @bp-hover {
  .feature-card:hover {
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
.feature-icon {
  flex: none;
  width: 22px;
  height: 22px;
  margin-right: 10px;
  color: var(--ev-accent);
}
.feature-card h3 {
  font-size: 17px;
  font-weight: 600;
  color: var(--ev-text);
}
.feature-card p {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: #4a4a4a;
}
.cta {
  text-align: center;
  max-width: 720px;
  margin: 0 auto;
}
.cta p,
.cta h3 {
  color: var(--ev-text-2);
  font-size: 15px;
  line-height: 1.7;
}
.cta h3 {
  font-weight: 600;
}

/* FAQ */
.faq {
  max-width: 800px;
  margin: 0 auto clamp(40px, 8vw, 60px);
}
.el-collapse {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  padding: 4px 12px;
  border: 0;
}
.faq :deep(.el-collapse-item__header) {
  font-size: 15px;
  color: var(--ev-text);
  height: auto;
  min-height: 52px;
  line-height: 1.5;
  padding: 14px 4px;
  text-align: left;
}
.faq :deep(.el-collapse-item__content) {
  font-size: 14px;
  color: var(--ev-text-2);
  line-height: 1.7;
  padding: 0 4px 18px;
}
.faq :deep(.el-collapse-item__content p) {
  margin: 0;
}
</style>
