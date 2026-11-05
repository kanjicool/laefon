# Dev server, used by docker-compose.dev.yml.
FROM node:24-slim
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@12.16.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN chown -R node:node /app
USER node
EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0"]
