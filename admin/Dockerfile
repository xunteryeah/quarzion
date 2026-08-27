FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY admin/package.json admin/package-lock.json ./
RUN npm ci
COPY admin/ ./
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001 QUARZION_DB_PATH=/data/quarzion.sqlite QUARZION_MIGRATION_PATH=/app/database/migrations/0001_unified.sql QUARZION_SELF_HOSTED_ADMIN=1
COPY --from=build /app/dist/standalone ./
COPY database/migrations ./database/migrations
RUN mkdir -p /data
EXPOSE 3001
CMD ["node", "server.js"]
