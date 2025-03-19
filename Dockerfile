# 使用 Node.js LTS 作为基础镜像
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 pnpm 相关文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages packages

RUN corepack enable

# 安装依赖
RUN pnpm install

# 打包子项目
RUN pnpm build

# 最终运行镜像
FROM node:20-alpine

WORKDIR /app

RUN corepack enable

# 只复制必要的文件
COPY --from=builder \
  /app/packages/backend/package.json \
  /app/packages/backend/dist \
  /app/packages/backend/public \
  /app/pnpm-lock.yaml \
  /app/

# 安装生产依赖
RUN pnpm install --prod

# 暴露端口（假设 backend 默认监听 3000）
EXPOSE 3000

# 启动应用
CMD ["pnpm", "start"]