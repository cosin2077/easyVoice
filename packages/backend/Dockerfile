FROM node:18-bullseye

WORKDIR /app

# 安装 Python 和 FFmpeg
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg && \
    ln -s /usr/bin/python3 /usr/bin/python

# 复制依赖并安装
COPY package.json .
COPY tsconfig.json .
RUN npm install && pip3 install edge-tts

# 复制源代码并构建
COPY src/ ./src/
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["npm", "start"]