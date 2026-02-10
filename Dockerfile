FROM node:20-bullseye

WORKDIR /app

# Prisma için gerekli
RUN apt-get update \
 && apt-get install -y openssl libssl1.1 ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --production

COPY . .

RUN npx prisma generate

EXPOSE 5000

CMD ["npm", "run", "start"]