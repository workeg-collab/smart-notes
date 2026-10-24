FROM nginx:alpine

# Clean default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static web app
COPY . /usr/share/nginx/html

# Expose standard port for Coolify
EXPOSE 80

# Health check so Coolify and Traefik detect container as healthy
HEALTHCHECK --interval=10s --timeout=3s --start-period=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
