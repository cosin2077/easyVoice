<template>
  <div class="home-container bg-background text-foreground w-full overflow-x-hidden transition-all duration-500 ease-in-out" :class="{ 'opacity-100 translate-y-0': isLoaded, 'opacity-0 translate-y-3': !isLoaded }">
    <!-- 顶部英雄区域 -->
    <section class="hero-section flex flex-col lg:flex-row items-center justify-between py-16 lg:py-24 px-6 lg:px-[8%] bg-gradient-to-br from-apple-lightgray to-white min-h-[80vh] relative overflow-hidden rounded-b-[30px] shadow-sm">
      <div class="hero-content flex-1 max-w-2xl z-10 mb-12 lg:mb-0">
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-apple-blue to-apple-lightblue bg-clip-text text-transparent leading-tight tracking-tight">
          EasyVoice
        </h1>
        <p class="text-xl md:text-2xl font-semibold mb-6 text-apple-darkgray tracking-tight">
          智能小说转语音解决方案
        </p>
        <p class="text-base md:text-lg mb-8 text-apple-mediumgray leading-relaxed">
          将文本一键转换为自然流畅的语音，支持多种角色配音和自定义设置
        </p>
        <Button @click="goToGenerate" class="px-8 py-3 text-base md:text-lg font-medium rounded-xl bg-apple-blue hover:bg-blue-600 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          立即体验
        </Button>
        <div class="mt-8">
          <a href="https://github.com/cosin2077/easyVoice" target="_blank" class="inline-flex items-center gap-2 text-apple-mediumgray hover:text-apple-blue px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors duration-300">
            <svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span>GitHub</span>
          </a>
        </div>
      </div>
      <div class="hero-image flex-1 flex justify-center items-center max-w-md lg:max-w-xl z-10">
        <img src="https://cdn-icons-png.flaticon.com/512/9496/9496915.png" alt="EasyVoice" class="w-full h-auto animate-float drop-shadow-xl" />
      </div>
    </section>

    <!-- 特点介绍区域 -->
    <section class="features-section py-20 px-6 lg:px-[10%] bg-white">
      <h2 class="text-3xl md:text-4xl font-bold mb-16 text-center text-apple-darkgray tracking-tight">
        产品特点
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div class="feature-card bg-apple-lightgray rounded-2xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-lg">
          <div class="feature-icon text-apple-blue bg-blue-50 p-4 rounded-xl inline-block mb-6">
            <svg viewBox="0 0 24 24" class="w-8 h-8" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 2h4v5l-2-1.5L12 10V5zM5 5h5v10H5V5zm14 14H5v-2h14v2zm0-5h-8V5h3v6.7l2.5-1.88L19 11.7V5z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-4 text-apple-darkgray">超长小说一键转换</h3>
          <p class="text-apple-mediumgray">支持处理大型文本文件，轻松将超长小说转换为语音</p>
        </div>
        <div class="feature-card bg-apple-lightgray rounded-2xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-lg">
          <div class="feature-icon text-apple-blue bg-blue-50 p-4 rounded-xl inline-block mb-6">
            <svg viewBox="0 0 24 24" class="w-8 h-8" fill="currentColor">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-4 text-apple-darkgray">多角色配音</h3>
          <p class="text-apple-mediumgray">支持多种语言、性别和角色特性的语音，为不同角色赋予独特声音</p>
        </div>
        <div class="feature-card bg-apple-lightgray rounded-2xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-lg">
          <div class="feature-icon text-apple-blue bg-blue-50 p-4 rounded-xl inline-block mb-6">
            <svg viewBox="0 0 24 24" class="w-8 h-8" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-4 text-apple-darkgray">语音试听</h3>
          <p class="text-apple-mediumgray">生成前可试听语音效果，确保最终结果符合预期</p>
        </div>
        <div class="feature-card bg-apple-lightgray rounded-2xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-lg">
          <div class="feature-icon text-apple-blue bg-blue-50 p-4 rounded-xl inline-block mb-6">
            <svg viewBox="0 0 24 24" class="w-8 h-8" fill="currentColor">
              <path d="M12 22C6.49 22 2 17.51 2 12S6.49 2 12 2s10 4.04 10 9c0 3.31-2.69 6-6 6h-1.77c-.28 0-.5.22-.5.5 0 .12.05.23.13.33.41.47.64 1.06.64 1.67A2.5 2.5 0 0 1 12 22zm0-18c-4.41 0-8 3.59-8 8s3.59 8 8 8c.28 0 .5-.22.5-.5a.54.54 0 0 0-.14-.35c-.41-.46-.63-1.05-.63-1.65a2.5 2.5 0 0 1 2.5-2.5H16c2.21 0 4-1.79 4-4 0-3.86-3.59-7-8-7z"/><circle cx="6.5" cy="11.5" r="1.5"/><circle cx="9.5" cy="7.5" r="1.5"/><circle cx="14.5" cy="7.5" r="1.5"/><circle cx="17.5" cy="11.5" r="1.5"/>
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-4 text-apple-darkgray">自定义设置</h3>
          <p class="text-apple-mediumgray">支持自定义语速、音调，以及接入自定义大模型和TTS服务</p>
        </div>
      </div>
    </section>

    <!-- 技术栈介绍 -->
    <section class="tech-section py-16 px-6 lg:px-[10%] bg-gradient-to-br from-apple-lightgray to-white rounded-3xl mx-4 lg:mx-[5%] shadow-sm">
      <h2 class="text-3xl md:text-4xl font-bold mb-12 text-center text-apple-darkgray tracking-tight">
        技术栈
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="tech-item bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex items-center gap-4">
          <span class="tech-icon text-3xl">🖥️</span>
          <span class="tech-name text-base font-medium text-apple-darkgray">前端: Vue 3 + TypeScript + Element Plus</span>
        </div>
        <div class="tech-item bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex items-center gap-4">
          <span class="tech-icon text-3xl">⚙️</span>
          <span class="tech-name text-base font-medium text-apple-darkgray">后端: Node.js + Express + TypeScript</span>
        </div>
        <div class="tech-item bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex items-center gap-4">
          <span class="tech-icon text-3xl">🔊</span>
          <span class="tech-name text-base font-medium text-apple-darkgray">语音合成: Microsoft Azure TTS + OpenAI</span>
        </div>
        <div class="tech-item bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex items-center gap-4">
          <span class="tech-icon text-3xl">🐳</span>
          <span class="tech-name text-base font-medium text-apple-darkgray">部署: Docker + Docker Compose</span>
        </div>
      </div>
    </section>

    <!-- 开始使用区域 -->
    <section class="get-started-section mt-20 py-16 lg:py-24 px-6 lg:px-[10%] bg-gradient-to-r from-apple-blue to-apple-lightblue text-white text-center rounded-t-[30px]">
      <div class="max-w-3xl mx-auto">
        <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 tracking-tight">准备好开始了吗？</h2>
        <p class="text-lg md:text-xl mb-10 opacity-90 max-w-2xl mx-auto leading-relaxed">
          立即体验 EasyVoice，将您的文本转换为自然流畅的语音。无需复杂设置，只需简单几步，即可获得专业级语音效果。
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <Button @click="goToGenerate" class="px-8 py-4 text-base md:text-lg font-medium rounded-xl bg-white text-apple-blue hover:bg-opacity-90 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            开始使用
          </Button>
          <a href="https://github.com/cosin2077/easyVoice" target="_blank" class="px-8 py-4 text-base md:text-lg font-medium rounded-xl border-2 border-white hover:bg-white hover:bg-opacity-10 transition-all duration-300 hover:-translate-y-1">
            查看文档
          </a>
        </div>
      </div>
    </section>

    <!-- 常见问题区域 -->
    <section class="faq-section py-20 px-6 lg:px-[10%] bg-white">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-3xl md:text-4xl font-bold mb-12 text-center text-apple-darkgray tracking-tight">
          常见问题
        </h2>
        <div class="space-y-6">
          <div class="faq-item bg-apple-lightgray rounded-xl p-6 transition-all duration-300 hover:shadow-md">
            <h3 class="text-xl font-semibold mb-3 text-apple-darkgray">EasyVoice 支持哪些语言？</h3>
            <p class="text-apple-mediumgray">目前 EasyVoice 主要支持中文和英文，未来将逐步增加对更多语言的支持。</p>
          </div>
          <div class="faq-item bg-apple-lightgray rounded-xl p-6 transition-all duration-300 hover:shadow-md">
            <h3 class="text-xl font-semibold mb-3 text-apple-darkgray">如何自定义语音角色？</h3>
            <p class="text-apple-mediumgray">在生成页面，您可以选择不同的语音角色，并调整语速、音调等参数，也可以通过 AI 智能推荐最适合的配置。</p>
          </div>
          <div class="faq-item bg-apple-lightgray rounded-xl p-6 transition-all duration-300 hover:shadow-md">
            <h3 class="text-xl font-semibold mb-3 text-apple-darkgray">EasyVoice 是否开源？</h3>
            <p class="text-apple-mediumgray">是的，EasyVoice 是一个完全开源的项目，您可以在 GitHub 上查看源代码，也欢迎贡献代码或提出建议。</p>
          </div>
          <div class="faq-item bg-apple-lightgray rounded-xl p-6 transition-all duration-300 hover:shadow-md">
            <h3 class="text-xl font-semibold mb-3 text-apple-darkgray">如何部署自己的 EasyVoice 实例？</h3>
            <p class="text-apple-mediumgray">我们提供了详细的部署文档，您可以按照文档指引，使用 Docker 快速部署自己的 EasyVoice 实例。</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 页脚区域 -->
    <footer class="footer-section py-12 px-6 lg:px-[10%] bg-apple-darkgray text-white">
      <div class="max-w-6xl mx-auto">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div class="footer-col">
            <h3 class="text-xl font-semibold mb-4">EasyVoice</h3>
            <p class="text-apple-lightgray mb-6">智能小说转语音解决方案，让文字有声有色。</p>
            <div class="social-links flex gap-4">
              <a href="https://github.com/cosin2077/easyVoice" target="_blank" class="text-white hover:text-apple-blue transition-colors duration-300">
                <svg viewBox="0 0 24 24" class="w-6 h-6" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
            </div>
          </div>
          <div class="footer-col">
            <h3 class="text-xl font-semibold mb-4">快速链接</h3>
            <ul class="space-y-2">
              <li><router-link to="/" class="text-apple-lightgray hover:text-white transition-colors duration-300">首页</router-link></li>
              <li><router-link to="/generate" class="text-apple-lightgray hover:text-white transition-colors duration-300">生成语音</router-link></li>
              <li><router-link to="/about" class="text-apple-lightgray hover:text-white transition-colors duration-300">关于我们</router-link></li>
            </ul>
          </div>
          <div class="footer-col">
            <h3 class="text-xl font-semibold mb-4">联系我们</h3>
            <p class="text-apple-lightgray">如有任何问题或建议，欢迎通过 GitHub Issues 与我们联系。</p>
          </div>
        </div>
        <div class="border-t border-gray-700 mt-10 pt-6 text-center text-apple-lightgray">
          <p>© {{ new Date().getFullYear() }} EasyVoice. 保留所有权利。</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'

const router = useRouter()
const isLoaded = ref(false)

onMounted(() => {
  // 页面加载动画
  setTimeout(() => {
    isLoaded.value = true
  }, 100)
})

const goToGenerate = () => {
  router.push('/generate')
}
</script>

<style scoped>
.animate-float {
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
  100% {
    transform: translateY(0px);
  }
}
</style>