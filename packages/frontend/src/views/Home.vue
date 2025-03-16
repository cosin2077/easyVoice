<template>
  <div class="home-container">
    <!-- 顶部英雄区域 -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="title">EasyVoice</h1>
        <p class="subtitle">智能小说转语音解决方案</p>
        <p class="description">将文本一键转换为自然流畅的语音，支持多种角色配音和自定义设置</p>
        <el-button type="primary" size="large" class="cta-button" @click="goToGenerate">立即体验</el-button>
        <div class="github-link">
          <a href="https://github.com/cosin2077/easyVoice" target="_blank" aria-label="GitHub 仓库">
            <el-icon><svg t="1624271791085" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2653" width="24" height="24"><path d="M512 42.666667A464.64 464.64 0 0 0 42.666667 502.186667 460.373333 460.373333 0 0 0 363.52 938.666667c23.466667 4.266667 32-9.813333 32-22.186667v-78.08c-130.56 27.733333-158.293333-61.44-158.293333-61.44a122.026667 122.026667 0 0 0-52.053334-67.413333c-42.666667-28.16 3.413333-27.733333 3.413334-27.733334a98.56 98.56 0 0 1 71.68 47.36 101.12 101.12 0 0 0 136.533333 37.973334 99.413333 99.413333 0 0 1 29.866667-61.44c-104.106667-11.52-213.333333-50.773333-213.333334-226.986667a177.066667 177.066667 0 0 1 47.36-124.16 161.28 161.28 0 0 1 4.693334-121.173333s39.68-12.373333 128 46.933333a455.68 455.68 0 0 1 234.666666 0c89.6-59.306667 128-46.933333 128-46.933333a161.28 161.28 0 0 1 4.693334 121.173333A177.066667 177.066667 0 0 1 810.666667 477.866667c0 176.64-110.08 215.466667-213.333334 226.986666a106.666667 106.666667 0 0 1 32 85.333334v125.866666c0 14.933333 8.533333 26.88 32 22.186667A460.8 460.8 0 0 0 981.333333 502.186667 464.64 464.64 0 0 0 512 42.666667" fill="currentColor" p-id="2654"></path></svg></el-icon>
            <span>GitHub</span>
          </a>
        </div>
      </div>
      <div class="hero-image">
        <img src="https://cdn-icons-png.flaticon.com/512/9496/9496915.png" alt="EasyVoice" />
      </div>
    </section>

    <!-- 特点介绍区域 -->
    <section class="features-section">
      <h2 class="section-title">产品特点</h2>
      <div class="features-grid">
        <div class="feature-card">
          <el-icon class="feature-icon"><svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M832 64H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V96c0-17.7-14.3-32-32-32zm-260 72h96v209.9L621.5 312 572 347.4V136zm220 752H232V136h280v296.9c0 3.3 1 6.6 3 9.3a15.9 15.9 0 0 0 22.3 3.7l83.8-59.9 81.4 59.4c2.7 2 6 3.1 9.4 3.1 8.8 0 16-7.2 16-16V136h64v752z" fill="currentColor"/></svg></el-icon>
          <h3>超长小说一键转换</h3>
          <p>支持处理大型文本文件，轻松将超长小说转换为语音</p>
        </div>
        <div class="feature-card">
          <el-icon class="feature-icon"><svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M678.3 642.4c24.2-13 51.9-20.4 81.4-20.4h.1c3 0 4.4-3.6 2.2-5.6a371.67 371.67 0 0 0-103.7-65.8c-.4-.2-.8-.3-1.2-.5C719.2 505 759.6 431.7 759.6 349c0-137-110.8-248-247.5-248S264.7 212 264.7 349c0 82.7 40.4 156 102.6 201.1-.4.2-.8.3-1.2.5-44.7 18.9-84.8 46-119.3 80.6a373.42 373.42 0 0 0-80.4 119.5A373.6 373.6 0 0 0 137 888.8a8 8 0 0 0 8 8.2h59.9c4.3 0 7.9-3.5 8-7.8 2-77.2 32.9-149.5 87.6-204.3C357 628.2 432.2 597 512.2 597c56.7 0 111.1 15.7 158 45.1a8.1 8.1 0 0 0 8.1.3zM512.2 521c-45.8 0-88.9-17.9-121.4-50.4A171.2 171.2 0 0 1 340.5 349c0-45.9 17.9-89.1 50.3-121.6S466.3 177 512.2 177s88.9 17.9 121.4 50.4A171.2 171.2 0 0 1 683.9 349c0 45.9-17.9 89.1-50.3 121.6C601.1 503.1 558 521 512.2 521zM880 759h-84v-84c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v84h-84c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h84v84c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8v-84h84c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8z" fill="currentColor"/></svg></el-icon>
          <h3>多角色配音</h3>
          <p>支持多种语言、性别和角色特性的语音，为不同角色赋予独特声音</p>
        </div>
        <div class="feature-card">
          <el-icon class="feature-icon"><svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M512 624c93.9 0 170-75.2 170-168V232c0-92.8-76.1-168-170-168s-170 75.2-170 168v224c0 92.8 76.1 168 170 168zm330-170c0-4.4-3.6-8-8-8h-60c-4.4 0-8 3.6-8 8 0 140.3-113.7 254-254 254S258 594.3 258 454c0-4.4-3.6-8-8-8h-60c-4.4 0-8 3.6-8 8 0 168.7 126.6 307.9 290 328.4V884H326.7c-13.7 0-24.7 14.3-24.7 32v36c0 4.4 2.8 8 6.2 8h407.6c3.4 0 6.2-3.6 6.2-8v-36c0-17.7-11-32-24.7-32H548V782.1c165.3-18.6 294-157.9 294-328.1z" fill="currentColor"/></svg></el-icon>
          <h3>语音试听</h3>
          <p>生成前可试听语音效果，确保最终结果符合预期</p>
        </div>
        <div class="feature-card">
          <el-icon class="feature-icon"><svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M880 112H144c-17.7 0-32 14.3-32 32v736c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V144c0-17.7-14.3-32-32-32zM513.1 518.1l-192 161c-5.2 4.4-13.1.7-13.1-6.1v-62.7c0-2.3 1.1-4.6 2.9-6.1L420.7 512l-109.8-92.2a7.63 7.63 0 0 1-2.9-6.1V351c0-6.8 7.9-10.5 13.1-6.1l192 160.9c3.9 3.2 3.9 9.1 0 12.3zM716 673c0 4.4-3.4 8-7.5 8h-185c-4.1 0-7.5-3.6-7.5-8v-48c0-4.4 3.4-8 7.5-8h185c4.1 0 7.5 3.6 7.5 8v48z" fill="currentColor"/></svg></el-icon>
          <h3>自定义设置</h3>
          <p>支持自定义语速、音调，以及接入自定义大模型和TTS服务</p>
        </div>
      </div>
    </section>

    <!-- 技术栈介绍 -->
    <section class="tech-section">
      <h2 class="section-title">技术栈</h2>
      <div class="tech-list">
        <div class="tech-item">
          <span class="tech-icon">🖥️</span>
          <span class="tech-name">前端: Vue 3 + TypeScript + Element Plus</span>
        </div>
        <div class="tech-item">
          <span class="tech-icon">⚙️</span>
          <span class="tech-name">后端: Node.js + Express + TypeScript</span>
        </div>
        <div class="tech-item">
          <span class="tech-icon">🔊</span>
          <span class="tech-name">语音合成: Microsoft Azure TTS + OpenAI</span>
        </div>
        <div class="tech-item">
          <span class="tech-icon">🐳</span>
          <span class="tech-name">部署: Docker + Docker Compose</span>
        </div>
      </div>
    </section>

    <!-- 开始使用区域 -->
    <section class="get-started-section">
      <div class="get-started-content">
        <h2>准备好开始了吗？</h2>
        <p>立即体验EasyVoice，将您的小说转换为生动的有声读物</p>
        <el-button type="primary" size="large" @click="goToGenerate">开始使用</el-button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { onMounted } from 'vue';

const router = useRouter();

const goToGenerate = () => {
  router.push('/novel-to-audio');
};

onMounted(() => {
  // 添加页面加载动画效果
  document.querySelector('.home-container')?.classList.add('loaded');
});
</script>

<style scoped>
.home-container {
  max-width: 100%;
  overflow-x: hidden;
  color: #2c3e50;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.home-container.loaded {
  opacity: 1;
  transform: translateY(0);
}

/* 英雄区域样式 */
.hero-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3rem 8%;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7eb 100%);
  min-height: 80vh;
  position: relative;
  overflow: hidden;
  border-radius: 0 0 30px 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.hero-content {
  flex: 1;
  max-width: 600px;
  z-index: 2;
}

.title {
  font-size: 4rem;
  font-weight: 700;
  margin-bottom: 1rem;
  background: linear-gradient(90deg, #0071e3, #34aadc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.2;
  letter-spacing: -0.5px;
}

.subtitle {
  font-size: 1.8rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: #1d1d1f;
  letter-spacing: -0.2px;
}

.description {
  font-size: 1.2rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  color: #6b7280;
}

.cta-button {
  padding: 0.75rem 2rem;
  font-size: 1.1rem;
  font-weight: 500;
  transition: all 0.3s ease;
  border-radius: 12px;
  background: #0071e3;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 113, 227, 0.2);
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 113, 227, 0.3);
  background: #0077ed;
}

.github-link {
  margin-top: 2rem;
}

.github-link a {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #4b5563;
  text-decoration: none;
  font-size: 1rem;
  transition: all 0.3s ease;
  padding: 0.5rem 1rem;
  border-radius: 8px;
}

.github-link a:hover {
  color: #0071e3;
  background: rgba(0, 113, 227, 0.05);
}

.hero-image {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  max-width: 500px;
  z-index: 1;
}

.hero-image img {
  max-width: 100%;
  height: auto;
  animation: float 6s ease-in-out infinite;
  filter: drop-shadow(0 10px 15px rgba(0, 0, 0, 0.1));
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

/* 特点区域样式 */
.features-section {
  padding: 5rem 10%;
  background-color: #fff;
  position: relative;
}

.section-title {
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 3rem;
  color: #1d1d1f;
  letter-spacing: -0.5px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2.5rem;
}

.feature-card {
  background: #f5f5f7;
  border-radius: 16px;
  padding: 2rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
}

.feature-icon {
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
  color: #0071e3;
  background: rgba(0, 113, 227, 0.1);
  padding: 1rem;
  border-radius: 12px;
}

.feature-card h3 {
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #1d1d1f;
}

.feature-card p {
  font-size: 1rem;
  line-height: 1.6;
  color: #6b7280;
}

/* 技术栈区域样式 */
.tech-section {
  padding: 5rem 10%;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7eb 100%);
  border-radius: 30px;
  margin: 0 2rem;
}

.tech-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.tech-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
  transition: all 0.3s ease;
}

.tech-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.tech-icon {
  font-size: 1.8rem;
}

.tech-name {
  font-size: 1rem;
  font-weight: 500;
  color: #1d1d1f;
}

/* 开始使用区域样式 */
.get-started-section {
  padding: 6rem 10%;
  background: linear-gradient(90deg, #0071e3, #34aadc);
  text-align: center;
  color: white;
  border-radius: 30px 30px 0 0;
  margin-top: 4rem;
}

.get-started-content h2 {
  font-size: 2.8rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  letter-spacing: -0.5px;
}

.get-started-content p {
  font-size: 1.2rem;
  max-width: 600px;
  margin: 0 auto 2rem;
  opacity: 0.9;
}

.get-started-content .el-button {
  background: white;
  color: #0071e3;
  border: none;
  padding: 0.75rem 2.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.get-started-content .el-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .hero-section {
    padding: 3rem 8%;
  }
  
  .title {
    font-size: 3.5rem;
  }
  
  .subtitle {
    font-size: 1.6rem;
  }
}

@media (max-width: 992px) {
  .hero-section {
    flex-direction: column;
    text-align: center;
    padding-top: 3rem;
    padding-bottom: 5rem;
  }
  
  .hero-content {
    max-width: 100%;
    margin-bottom: 3rem;
  }
  
  .title {
    font-size: 3rem;
  }
  
  .github-link {
    justify-content: center;
    display: flex;
  }
  
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .tech-list {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .tech-list {
    grid-template-columns: 1fr;
  }
  
  .title {
    font-size: 2.5rem;
  }
  
  .subtitle {
    font-size: 1.4rem;
  }
  
  .get-started-content h2 {
    font-size: 2.2rem;
  }
}

@media (max-width: 576px) {
  .hero-section {
    padding: 2rem 5%;
  }
  
  .features-section,
  .tech-section {
    padding: 3rem 5%;
  }
  
  .tech-section {
    margin: 0 1rem;
  }
  
  .title {
    font-size: 2.2rem;
  }
  
  .section-title {
    font-size: 2rem;
  }
  
  .get-started-content h2 {
    font-size: 1.8rem;
  }
}
</style>