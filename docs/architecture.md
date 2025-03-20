# 架构概述

## 技术原理

- 前端: Vue + element-plus 提供前端交互页面
- 后端: Express 提供 HTTP、API 服务
- 语音合成: edge-tts 提供语音合成服务
- 部署: Docker 提供容器化部署方案 or Node.js 提供本地部署方案

## 特色

- 一键部署到自己服务器或者电脑, 支持 Docker 和 Node.js 两种部署方式
- 简单易用的 WEB UI 页面
- 提供了试听功能
- 支持语速、音调、音量等参数调整
- 长文本支持，可以将大型文本文件快速一键转换为语音(实现原理: 文本分片，后端实现为并发调用 edge-tts 服务，在用 ffmpeg 拼接音频文件，根据角色和文本内容智能缓存音频文件，减少重复调用，提高效率)

## TODO

- 仅是 edge-tts api的封装，缺乏核心技术创新？没有核心技术？
- UI 界面也没有特别惊艳，就是普通水平。

## 技术栈 🛠️

- **前端**  
  - Vue.js  
  - Element Plus  
- **后端**  
  - Express.js  
- **语音合成**  
  - edge-tts  
  - ffmpeg
  - Other TTS engines
- **部署**  
  - Docker  
  - Node.js  

## 项目结构 📁

```bash
easyVoice
├── Dockerfile
├── README.md
├── docker-compose.yml
├── docs
│   ├── api.md
│   └── architecture.md
├── images
│   ├── readme.generate.png
│   └── readme.home.png
├── node_modules
├── package.json
├── packages
│   ├── backend
│   │   ├── Dockerfile
│   │   ├── README.md
│   │   ├── audio
│   │   ├── dist
│   │   ├── logs
│   │   ├── node_modules
│   │   ├── package.json
│   │   ├── public
│   │   ├── src
│   │   ├── tests
│   │   └── tsconfig.json
│   ├── frontend
│   │   ├── README.md
│   │   ├── components.json
│   │   ├── dist
│   │   ├── index.html
│   │   ├── node_modules
│   │   ├── package.json
│   │   ├── pnpm-lock.yaml
│   │   ├── public
│   │   ├── src
│   │   ├── tailwind.config.js
│   │   ├── tsconfig.app.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.node.json
│   │   └── vite.config.ts
│   └── shared
│       ├── constants
│       ├── node_modules
│       ├── package.json
│       ├── tsconfig.json
│       ├── types
│       └── utils
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── scripts
│   ├── deploy.sh
│   ├── run.sh
│   ├── run.test.sh
│   ├── setup.bat
│   └── setup.sh
├── tech.log
└── test.html
```
