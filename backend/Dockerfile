FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/

COPY node_modules ./node_modules
COPY backend/node_modules ./backend/node_modules
COPY backend/dist ./backend/dist

WORKDIR /app/backend

EXPOSE 5000

CMD ["node", "dist/server.js"]
