# syntax=docker/dockerfile:1

###############################################################################
# Stage 1 — build: install deps and compile TypeScript -> dist/               #
###############################################################################
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first (better layer caching). npm ci uses the committed
# lockfile for reproducible builds.
COPY package.json package-lock.json ./
RUN npm ci

# Compile the TypeScript sources.
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

###############################################################################
# Stage 2 — runtime: production-only deps + compiled output                   #
###############################################################################
FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Install ONLY production dependencies (from the lockfile).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy the compiled JavaScript from the build stage.
COPY --from=build /app/dist ./dist

# IMPORTANT: The rule markdown files are NOT copied into the image.
# They are bind-mounted at runtime (see docker-compose.yml) so an external
# host cron job can update them without rebuilding this image.
# We create the mount point so the container starts cleanly even if empty.
RUN mkdir -p /app/rules

# Run as the built-in non-root "node" user for safety.
USER node

ENV PORT=3000
ENV RULES_DIR=/app/rules
EXPOSE 3000

# Self-describing healthcheck (works with `docker run`, not just compose).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
