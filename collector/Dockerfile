FROM node:22-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY src ./src

ENV NODE_ENV=production \
    COLLECTOR_WORKER_ID=collector-cn-shanghai-01 \
    COLLECTOR_LABEL="Shanghai official API worker" \
    COLLECTOR_POLL_MS=5000 \
    COLLECTOR_PLATFORMS="doubao,qwen,deepseek"

USER node
CMD ["node", "src/api-worker.mjs"]
