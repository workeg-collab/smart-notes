FROM nginx:alpine

# Install Node.js for the unified cloud sync backend
RUN apk add --no-cache nodejs

# Clean default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create app directory for Node API & persistent data
WORKDIR /app
COPY server.js /app/server.js
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh && mkdir -p /app/data && chmod 777 /app/data

# Copy static web app to Nginx html directory
COPY . /usr/share/nginx/html

VOLUME ["/app/data"]
EXPOSE 80

# Health check verifies both Nginx and Node.js API are healthy
HEALTHCHECK --interval=10s --timeout=3s --start-period=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/api/health || exit 1

CMD ["/app/entrypoint.sh"]
