<template>
  <div class="home-container">
    <!-- 头部：简介和 CTA -->
    <section class="hero-section">
      <el-container class="max-w-6xl mx-auto py-16 text-center">
        <el-main>
          <h1 class="text-4xl font-bold mb-4">EasyVoice</h1>
          <p class="text-xl text-gray-600 mb-8">
            智能小说转语音解决方案<br />
            将文本一键转换为自然流畅的语音，支持多种角色配音和自定义设置
          </p>
          <div class="flex justify-center gap-4">
            <el-button type="primary" size="large" @click="goToGenerate">
              立即体验
            </el-button>
            <el-button plain size="large" @click="goToGitHub">
              <el-icon class="mr-2"><link /></el-icon>
              GitHub
            </el-button>
          </div>
        </el-main>
      </el-container>
    </section>

    <!-- 产品特点 -->
    <section class="features-section bg-gray-50 py-16">
      <div class="max-w-6xl mx-auto">
        <h2 class="text-3xl font-bold text-center mb-12">产品特点</h2>
        <el-row :gutter="20">
          <el-col
            :span="12"
            :md="6"
            v-for="feature in features"
            :key="feature.title"
            class="mb-8"
          >
            <el-card shadow="hover" class="h-full">
              <div class="text-center">
                <el-icon :size="40" class="mb-4 text-blue-500">
                  <component :is="feature.icon" />
                </el-icon>
                <h3 class="text-xl font-semibold mb-2">{{ feature.title }}</h3>
                <p class="text-gray-600">{{ feature.description }}</p>
              </div>
            </el-card>
          </el-col>
        </el-row>
        <div class="text-center mt-12">
          <el-button type="primary" size="large" @click="goToGenerate">
            立即体验 EasyVoice
          </el-button>
          <p class="text-gray-600 mt-4">
            将您的文本转换为自然流畅的语音。无需复杂设置，只需简单几步，即可获得专业级语音效果。
          </p>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="faq-section py-16">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-3xl font-bold text-center mb-12">常见问题</h2>
        <el-collapse accordion>
          <el-collapse-item
            v-for="(faq, index) in faqs"
            :key="index"
            :title="faq.question"
            :name="index"
          >
            <div>{{ faq.answer }}</div>
          </el-collapse-item>
        </el-collapse>
      </div>
    </section>

    <!-- 底部 -->
    <footer class="footer bg-gray-800 text-white py-8">
      <div class="max-w-6xl mx-auto">
        <el-row :gutter="20">
          <el-col :span="12" :md="6">
            <h3 class="text-lg font-semibold mb-4">快速链接</h3>
            <ul class="space-y-2">
              <li><a href="#" class="hover:text-blue-400">首页</a></li>
              <li>
                <router-link to="/generate" class="hover:text-blue-400"
                  >生成语音</router-link
                >
              </li>
              <li><a href="#" class="hover:text-blue-400">关于我们</a></li>
              <li><a href="#" class="hover:text-blue-400">联系我们</a></li>
            </ul>
          </el-col>
          <el-col :span="12" :md="18" class="mt-4 md:mt-0">
            <p class="text-gray-400">
              如有任何问题或建议，欢迎通过
              <a
                href="https://github.com/cosin2077/easyVoice/issues"
                class="text-blue-400 hover:underline"
              >
                GitHub Issues
              </a>
              与我们联系。
            </p>
            <p class="mt-4 text-gray-400">© 2025 EasyVoice. 保留所有权利。</p>
          </el-col>
        </el-row>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { Link, CircleCheck, User, Setting } from "@element-plus/icons-vue";
import { useRouter } from "vue-router";

// 路由跳转
const router = useRouter();
const goToGenerate = () => router.push("/generate");
const goToGitHub = () =>
  window.open("https://github.com/cosin2077/easyVoice", "_blank");

// 产品特点数据
const features = [
  {
    title: "超长小说一键转换",
    description: "支持处理大型文本文件，轻松将超长小说转换为语音",
    icon: CircleCheck,
  },
  {
    title: "多角色配音",
    description: "支持多种语言、性别和角色特性的语音，为不同角色赋予独特声音",
    icon: User,
  },
  {
    title: "语音试听",
    description: "生成前可试听语音效果，确保最终结果符合预期",
    icon: CircleCheck,
  },
  {
    title: "自定义设置",
    description: "支持自定义语速、音调，以及接入自定义大模型和TTS服务",
    icon: Setting,
  },
];

// FAQ 数据
const faqs = [
  {
    question: "如何自定义语音角色？",
    answer:
      "在生成页面，您可以选择不同的语音角色，并调整语速、音调等参数，也可以通过 AI 智能推荐最适合的配置。",
  },
  {
    question: "如何部署自己的 EasyVoice 实例？",
    answer:
      "我们提供了详细的部署文档，您可以按照文档指引，使用 Docker 快速部署自己的 EasyVoice 实例。",
  },
];
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.hero-section {
  background: linear-gradient(to bottom, #f0f7ff, #ffffff);
}

.features-section {
  background-color: #f9fafb;
}

.footer a {
  color: inherit;
  text-decoration: none;
}

.footer a:hover {
  color: #60a5fa;
}
</style>
