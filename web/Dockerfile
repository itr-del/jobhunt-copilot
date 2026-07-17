# jobhunt-copilot 网页工作台（前端 + Hono 文件后端）
FROM node:20-alpine

WORKDIR /app

# 先装依赖（利用镜像层缓存）
COPY package.json package-lock.json ./
RUN npm ci

# 拷贝源码并构建前端
COPY . .
RUN npm run build

ENV NODE_ENV=production
# 不设置 WORKSPACE_DIR 时进入演示模式（内置 demo-workspace/）
# 本地真实使用：docker run -e WORKSPACE_DIR=/workspace -v /你的求职工作区:/workspace ...
EXPOSE 8787

CMD ["npm", "start"]
