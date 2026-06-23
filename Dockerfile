FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
COPY backend/prisma ./prisma/

RUN npm ci

COPY backend/ .

ENV DATABASE_URL="postgresql://user:password@localhost:5432/dummy"

RUN npx prisma generate
RUN npm run build

EXPOSE 8080

CMD ["npm", "run", "start:prod"]
