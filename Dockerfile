# ===== Stage 1: Build =====
FROM node:20-alpine AS build

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy workspace config first for better caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY shared/package.json shared/
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/

RUN pnpm install --frozen-lockfile

# Copy source code
COPY shared/ shared/
COPY packages/server/ packages/server/
COPY packages/web/ packages/web/
COPY tsconfig.base.json ./

# Build all packages: shared -> server -> web
RUN pnpm build

# ===== Stage 2: Server =====
FROM node:20-alpine AS server

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY shared/package.json shared/
COPY packages/server/package.json packages/server/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built server
COPY --from=build /app/packages/server/dist/ packages/server/dist/
COPY --from=build /app/shared/dist/ shared/dist/
COPY --from=build /app/shared/package.json shared/package.json

# Copy migration and seed files (needed at runtime)
COPY packages/server/src/db/migrations/ packages/server/src/db/migrations/
COPY packages/server/src/db/seed.ts packages/server/src/db/seed.ts
COPY packages/server/src/db/schema/ packages/server/src/db/schema/
COPY packages/server/src/utils/password.ts packages/server/src/utils/password.ts
COPY packages/server/drizzle.config.ts packages/server/drizzle.config.ts
COPY packages/server/tsconfig.json packages/server/tsconfig.json

# Install tsx and drizzle-kit for migrations/seed (not in prod deps)
RUN pnpm add -w tsx drizzle-kit

# Create uploads directory
RUN mkdir -p /app/uploads/receipts /app/uploads/documents

# Copy entrypoint
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]

# ===== Stage 3: Nginx (Frontend) =====
FROM nginx:alpine AS nginx

# Copy built frontend
COPY --from=build /app/packages/web/build/ /usr/share/nginx/html/

# Copy nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
