# ---- base ----
FROM node:22-slim AS base
WORKDIR /app
# openssl จำเป็นสำหรับ Prisma query engine
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# ---- build ----
FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- runner ----
FROM base AS runner
ENV NODE_ENV=production
# คัดลอกทั้งแอป (รวม node_modules + .next + prisma client ที่ generate แล้ว)
COPY --from=build /app ./
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
