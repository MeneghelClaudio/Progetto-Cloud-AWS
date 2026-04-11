FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

COPY frontend /usr/share/nginx/html
COPY data.json /usr/share/nginx/html/data.json
COPY frontend/script.js /usr/share/nginx/html/script.js

EXPOSE 80