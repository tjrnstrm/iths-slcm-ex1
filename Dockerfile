# syntax=docker/dockerfile:1

# ---------- Stage 1: install dependencies (cached until package*.json changes)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- Stage 2: build the Next.js app
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- Stage 3: minimal runtime image (no source code, no dev dependencies)
FROM node:22-alpine AS runner
WORKDIR /app

# HOSTNAME=0.0.0.0 makes the server reachable from outside the container.
# PORT=3000 is the default; Render overrides it with its own PORT variable.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# Run as an unprivileged user instead of root
RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001 -G nodejs

# The standalone output holds server.js plus only the node_modules it needs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# Mark the container unhealthy if /health stops answering (alpine has no curl)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
