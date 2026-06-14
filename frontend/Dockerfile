FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Baked in at build time since Vite inlines import.meta.env.* into the bundle.
# Set to the public backend URL (e.g. https://api-nimiqlens.example.com).
ARG VITE_API_BASE_URL=""
ARG VITE_TIP_ADDRESS=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_TIP_ADDRESS=$VITE_TIP_ADDRESS

RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
