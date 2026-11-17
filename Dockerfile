FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS build
COPY client/package*.json ./client/
COPY server/package*.json ./server/
COPY server/prisma/schema.prisma ./server/prisma/
RUN npm ci --prefix client --include=dev && npm ci --prefix server --include=dev
COPY . .
RUN npm run build:aws

FROM base AS runtime
ENV NODE_ENV=production FINSENSE_SAME_ORIGIN=true PORT=8080 HOSTNAME=0.0.0.0
WORKDIR /app/server
COPY --from=build --chown=node:node /app/server/package.json ./
COPY --from=build --chown=node:node /app/server/next.config.ts ./
COPY --from=build --chown=node:node /app/server/node_modules ./node_modules
COPY --from=build --chown=node:node /app/server/.next-aws ./.next-aws
COPY --from=build --chown=node:node /app/server/public ./public
COPY --from=build --chown=node:node /app/server/prisma/schema.prisma /app/server/prisma/seed.ts /app/server/prisma/ensure-admin.ts ./prisma/
USER node
EXPOSE 8080
CMD ["npm", "start", "--", "--hostname", "0.0.0.0"]
