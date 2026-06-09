FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3000

ENV DATABASE_URL="file:/data/sagenotes.db"
ENV HOST="0.0.0.0"
ENV PORT="3000"

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node prisma/seed.js && node build/index.js"]
