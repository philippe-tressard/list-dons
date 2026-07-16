FROM node:22-alpine
WORKDIR /app

# Dépendances (couche cache)
COPY package*.json ./
RUN npm ci --omit=dev

# Code
COPY . .
RUN mkdir -p /app/data

ENV PORT=8080
EXPOSE 8080

# Healthcheck simple (sans dépendance externe)
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+ (process.env.PORT||8080) +'/api/session',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
