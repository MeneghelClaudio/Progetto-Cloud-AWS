FROM nginx:alpine

# Rimuove i file di default di nginx
RUN rm -rf /usr/share/nginx/html/*

# Copia tutti i file del tuo progetto
COPY . /usr/share/nginx/html

# Espone la porta 80
EXPOSE 80