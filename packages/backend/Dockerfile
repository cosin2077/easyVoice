# 使用更精简的基础镜像并添加版本标签
FROM node:20-alpine3.19 AS builder

# 设置工作目录
WORKDIR /app

# 启用 corepack
RUN corepack enable

# 复制包管理文件
COPY package.json tsconfig.json ./

# 安装所有依赖（包括 devDependencies，因为需要构建）
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY src/ ./src/

# 构建项目
RUN pnpm run build

# 多阶段构建 - 生产镜像
FROM node:20-alpine3.19 AS production

WORKDIR /app

RUN apk add --no-cache ffmpeg

RUN corepack enable

COPY package.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public  ./public

RUN pnpm install --prod --frozen-lockfile

ENV NODE_ENV=production
EXPOSE 3000

# 使用非 root 用户运行
USER node

# 启动命令
CMD ["pnpm", "start"]

HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl --fail http://localhost:3000/health || exit 1