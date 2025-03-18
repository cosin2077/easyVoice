# 使用 Node.js LTS 作为基础镜像
FROM node:18 AS builder

# 设置工作目录
WORKDIR /app

# 复制 pnpm 相关文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages packages

# 安装 pnpm
RUN npm install -g pnpm

# 安装依赖
RUN pnpm install

# 构建 shared 包（如果需要）
RUN cd packages/shared && pnpm build || true

# 构建 frontend
RUN cd packages/frontend && pnpm build

# 构建 backend（如果需要）
RUN cd packages/backend && pnpm build || true

# 复制 frontend 构建输出到 backend 的 public 目录
RUN mkdir -p packages/backend/public && cp -r packages/frontend/dist/* packages/backend/public/

# 最终运行镜像
FROM node:18-slim

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 只复制必要的文件
COPY --from=builder /app/packages/backend /app
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/

# 安装生产依赖
RUN pnpm install --prod

# 暴露端口（假设 backend 默认监听 3000）
EXPOSE 3000

# 启动应用
CMD ["pnpm", "start"]