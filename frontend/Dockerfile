FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 QUARZION_DB_PATH=/data/quarzion.sqlite QUARZION_MIGRATION_PATH=/app/database/migrations/0001_unified.sql
COPY --from=build /app/dist/standalone ./
COPY database/migrations ./database/migrations
RUN mkdir -p /data
EXPOSE 3000
CMD ["node", "server.js"]
