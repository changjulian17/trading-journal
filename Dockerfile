FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.js ./
COPY server/ ./server/
COPY public/ ./public/
COPY logic.js snapshots.json ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
