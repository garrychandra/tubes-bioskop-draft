FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production

FROM base AS final
COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 5000
CMD ["node", "src/index.js"]
