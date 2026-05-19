# syntax=docker/dockerfile:1.7
# Multi-stage build for the PMS Next.js app.
# Output: a small runtime image (~200 MB) using Next.js standalone server.

# ---------- 1. Dependencies ----------
FROM node:20-alpine AS deps
WORKDIR /app

# Install only the packages needed to install deps cleanly on Alpine
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund


# ---------- 2. Build ----------
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next telemetry inside the build
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js will emit .next/standalone and .next/static thanks to
# `output: 'standalone'` in next.config.ts
RUN npm run build


# ---------- 3. Runner ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as a non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy the standalone server bundle + static assets + public/ if present.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Persistent file-storage mount point (created so non-root user can write
# even before the volume is attached the first time).
RUN mkdir -p /data/pms-files && chown -R nextjs:nodejs /data/pms-files

USER nextjs

EXPOSE 3000

# Standalone build produces /app/server.js at the workdir root
CMD ["node", "server.js"]
