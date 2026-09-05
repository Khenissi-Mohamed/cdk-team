FROM node:20-slim

# ffmpeg n'est pas une dépendance npm : il est appelé en sous-processus pour
# extraire la vignette (poster) et la durée des vidéos uploadées. Sans lui,
# l'upload vidéo échoue au runtime avec un ENOENT peu parlant.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Marque l'image comme production. C'est ce qui referme le CORS sur la seule
# origine de CLIENT_URL : hors conteneur la variable est absente, et le serveur
# accepte alors n'importe quel port de localhost pour le développement.
ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# uploads/ n'est jamais inclus dans l'image : c'est un volume monté en prod
# (voir deployment/docker-compose.yml), sinon les médias disparaissent à
# chaque rebuild.

USER node

EXPOSE 4003

CMD ["node", "src/index.js"]
