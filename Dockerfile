# syntax=docker/dockerfile:1
# Voice Viva as one container: build with pnpm, run the production server with srvx.
# Secrets stay out of the image: .env.local is mounted only while building (for the
# public VITE_ Firebase values baked into the browser bundle) and passed at run time
# for the server-only values (ANTHROPIC_API_KEY, FIREBASE_PROJECT_ID).

FROM node:24-slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.8.0 --activate

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN --mount=type=secret,id=env_local,target=/app/.env.local,required=true \
    pnpm build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Read by the server at run time: the case file and the reference-note passages.
COPY data ./data
COPY ["docs/requirements/Eye Academy - Developer Take-Home (Case EA-VIVA-001).json", "./docs/requirements/"]
USER node
EXPOSE 3000
CMD ["node", "node_modules/srvx/bin/srvx.mjs", "serve", "--prod", "-s", "../client", "--entry", "dist/server/server.js"]
