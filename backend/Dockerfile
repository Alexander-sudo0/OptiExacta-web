FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY server.js ./server.js
COPY lib ./lib
COPY middleware ./middleware

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
