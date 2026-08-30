# Ce Dockerfile ne sert qu'à produire un build reproductible du site
# statique (dist/) — il n'y a pas de conteneur nginx dédié en prod, c'est
# le Nginx déjà présent sur le VPS qui sert ces fichiers directement
# (voir deployment/deploy.sh et deployment/nginx.conf.example).
#
# VITE_API_URL est inliné dans le JS au moment du build (Vite), pas lu au
# runtime navigateur : tout changement d'URL d'API exige de refaire
# `docker build` avec le bon --build-arg, pas juste redéployer un ancien dist/.

FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build
# → produit /app/dist, extrait ensuite via `docker cp` (voir deploy.sh)
