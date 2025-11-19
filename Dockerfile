FROM nginx:alpine

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos estáticos
COPY . /usr/share/nginx/html

EXPOSE 80