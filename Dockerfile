FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3000

ENV DATABASE_URL="file:/data/sagenotes.db"

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node prisma/seed.js && node build/index.js"]
