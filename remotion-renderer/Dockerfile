FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ffmpeg \
    fonts-dejavu-core \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROMIUM_PATH=/usr/bin/chromium

WORKDIR /app

COPY package.json .
RUN npm install --omit=dev

COPY tsconfig.json .
COPY server.ts .
COPY src/ src/

EXPOSE 8080

CMD ["npx", "tsx", "server.ts"]
