FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/server.js ./

RUN apk add --no-cache nginx

COPY frontend /usr/share/nginx/html
COPY nginx.conf /etc/nginx/http.d/default.conf

EXPOSE 80

CMD ["sh", "-c", "node server.js & nginx -g 'daemon off;'"]