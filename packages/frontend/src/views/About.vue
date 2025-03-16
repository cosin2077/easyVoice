<template>
  <div class="about-container">
    <!-- 页面标题 -->
    <div class="about-header">
      <h1>关于 EasyVoice</h1>
      <div class="divider"></div>
    </div>

    <!-- 项目介绍 -->
    <div class="about-content">
      <div class="project-info">
        <h2>项目简介</h2>
        <p>EasyVoice 是一个开源的智能小说转语音解决方案，旨在帮助用户轻松将文本内容转换为高质量的语音输出。</p>
        <p>本项目利用先进的语音合成技术，结合人工智能，为用户提供自然流畅的语音体验，特别适合将小说、文章等长篇内容转换为有声读物。</p>
        
        <h3>核心功能</h3>
        <ul>
          <li><strong>文本转语音：</strong>支持将大型文本文件一键转换为语音</li>
          <li><strong>多语言支持：</strong>支持中文、英文等多种语言</li>
          <li><strong>角色配音：</strong>提供多种声音特性，适合不同角色配音需求</li>
          <li><strong>自定义设置：</strong>可调整语速、音调等参数</li>
          <li><strong>AI 推荐：</strong>支持通过 AI 智能推荐最适合的语音配置</li>
          <li><strong>试听功能：</strong>生成前可试听语音效果</li>
        </ul>

        <h3>技术实现</h3>
        <p>EasyVoice 采用现代化的技术栈构建：</p>
        <ul>
          <li><strong>前端：</strong>Vue 3 + TypeScript + Element Plus</li>
          <li><strong>后端：</strong>Node.js + Express + TypeScript</li>
          <li><strong>语音合成：</strong>Microsoft Azure TTS + OpenAI</li>
          <li><strong>部署：</strong>Docker + Docker Compose</li>
        </ul>
      </div>

      <div class="author-info">
        <h2>关于作者</h2>
        <p>EasyVoice 由热爱开源和语音技术的开发者创建，致力于为用户提供简单易用的语音转换工具。</p>
        
        <div class="github-link">
          <a href="https://github.com/cosin2077" target="_blank" class="github-button">
            <el-icon><svg t="1624271791085" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2653" width="24" height="24"><path d="M512 42.666667A464.64 464.64 0 0 0 42.666667 502.186667 460.373333 460.373333 0 0 0 363.52 938.666667c23.466667 4.266667 32-9.813333 32-22.186667v-78.08c-130.56 27.733333-158.293333-61.44-158.293333-61.44a122.026667 122.026667 0 0 0-52.053334-67.413333c-42.666667-28.16 3.413333-27.733333 3.413334-27.733334a98.56 98.56 0 0 1 71.68 47.36 101.12 101.12 0 0 0 136.533333 37.973334 99.413333 99.413333 0 0 1 29.866667-61.44c-104.106667-11.52-213.333333-50.773333-213.333334-226.986667a177.066667 177.066667 0 0 1 47.36-124.16 161.28 161.28 0 0 1 4.693334-121.173333s39.68-12.373333 128 46.933333a455.68 455.68 0 0 1 234.666666 0c89.6-59.306667 128-46.933333 128-46.933333a161.28 161.28 0 0 1 4.693334 121.173333A177.066667 177.066667 0 0 1 810.666667 477.866667c0 176.64-110.08 215.466667-213.333334 226.986666a106.666667 106.666667 0 0 1 32 85.333334v125.866666c0 14.933333 8.533333 26.88 32 22.186667A460.8 460.8 0 0 0 981.333333 502.186667 464.64 464.64 0 0 0 512 42.666667" fill="currentColor" p-id="2654"></path></svg></el-icon>
            <span>访问作者 GitHub</span>
          </a>
        </div>

        <div class="project-github-link">
          <a href="https://github.com/cosin2077/easyVoice" target="_blank" class="github-button">
            <el-icon><svg t="1624271791085" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2653" width="24" height="24"><path d="M512 42.666667A464.64 464.64 0 0 0 42.666667 502.186667 460.373333 460.373333 0 0 0 363.52 938.666667c23.466667 4.266667 32-9.813333 32-22.186667v-78.08c-130.56 27.733333-158.293333-61.44-158.293333-61.44a122.026667 122.026667 0 0 0-52.053334-67.413333c-42.666667-28.16 3.413333-27.733333 3.413334-27.733334a98.56 98.56 0 0 1 71.68 47.36 101.12 101.12 0 0 0 136.533333 37.973334 99.413333 99.413333 0 0 1 29.866667-61.44c-104.106667-11.52-213.333333-50.773333-213.333334-226.986667a177.066667 177.066667 0 0 1 47.36-124.16 161.28 161.28 0 0 1 4.693334-121.173333s39.68-12.373333 128 46.933333a455.68 455.68 0 0 1 234.666666 0c89.6-59.306667 128-46.933333 128-46.933333a161.28 161.28 0 0 1 4.693334 121.173333A177.066667 177.066667 0 0 1 810.666667 477.866667c0 176.64-110.08 215.466667-213.333334 226.986666a106.666667 106.666667 0 0 1 32 85.333334v125.866666c0 14.933333 8.533333 26.88 32 22.186667A460.8 460.8 0 0 0 981.333333 502.186667 464.64 464.64 0 0 0 512 42.666667" fill="currentColor" p-id="2654"></path></svg></el-icon>
            <span>访问项目 GitHub</span>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 无需额外的脚本逻辑
</script>

<style scoped>
.about-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 3rem 2rem;
  color: #2c3e50;
}

.about-header {
  text-align: center;
  margin-bottom: 3rem;
}

.about-header h1 {
  font-size: 2.8rem;
  font-weight: 700;
  margin-bottom: 1rem;
  background: linear-gradient(90deg, #1a56db, #4f46e5);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.divider {
  height: 4px;
  width: 80px;
  margin: 0 auto;
  background: linear-gradient(90deg, #1a56db, #4f46e5);
  border-radius: 2px;
}

.about-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 3rem;
}

.project-info h2,
.author-info h2 {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: #1a56db;
}

.project-info h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 2rem 0 1rem;
  color: #2d3748;
}

.project-info p,
.author-info p {
  font-size: 1.1rem;
  line-height: 1.7;
  margin-bottom: 1.5rem;
  color: #4b5563;
}

.project-info ul {
  padding-left: 1.5rem;
  margin-bottom: 1.5rem;
}

.project-info li {
  margin-bottom: 0.8rem;
  line-height: 1.6;
  color: #4b5563;
}

.github-link,
.project-github-link {
  margin-top: 2rem;
}

.github-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background-color: #f3f4f6;
  border-radius: 8px;
  color: #4b5563;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
}

.github-button:hover {
  background-color: #e5e7eb;
  color: #1a56db;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 响应式布局 */
@media (max-width: 992px) {
  .about-content {
    grid-template-columns: 1fr;
  }
  
  .about-header h1 {
    font-size: 2.4rem;
  }
}

@media (max-width: 768px) {
  .about-container {
    padding: 2rem 1.5rem;
  }
  
  .about-header h1 {
    font-size: 2rem;
  }
  
  .project-info h2,
  .author-info h2 {
    font-size: 1.8rem;
  }
  
  .project-info h3 {
    font-size: 1.3rem;
  }
}

@media (max-width: 576px) {
  .about-container {
    padding: 1.5rem 1rem;
  }
  
  .about-header h1 {
    font-size: 1.8rem;
  }
  
  .project-info h2,
  .author-info h2 {
    font-size: 1.5rem;
  }
}
</style>
