FROM node:20-alpine

RUN apk add --no-cache wget

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

RUN apk add --no-cache curl

COPY . .

RUN mkdir -p data uploads

EXPOSE 8000

ENV NODE_ENV=production
ENV PORT=8000

CMD ["node", "server.js"]
