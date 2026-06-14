FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Baked in at build time since Vite inlines import.meta.env.* into the bundle.
# Homelab stacks proxy /api to the backend instead, so this can stay empty there.
# GitHub Pages builds should set VITE_API_BASE_URL to the public backend URL.
ARG VITE_API_BASE_URL=""
ARG VITE_TIP_ADDRESS=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_TIP_ADDRESS=$VITE_TIP_ADDRESS

RUN npm run build

FROM nginx:alpine
COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
