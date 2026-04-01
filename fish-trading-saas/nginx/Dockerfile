# =============================================================================
# FisherP – Nginx Container Dockerfile
# Standalone Nginx image for the fish-trading-saas/nginx directory
# =============================================================================

FROM nginx:1.27-alpine

# Remove the default configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy site configuration files
COPY nginx.conf /etc/nginx/nginx.conf
COPY ssl.conf /etc/nginx/conf.d/ssl.conf
COPY proxy_params.conf /etc/nginx/conf.d/proxy_params.conf

# Create directories for SSL certificates and served files
RUN mkdir -p /etc/nginx/ssl \
             /var/www/static \
             /var/www/media

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsSL http://localhost/health/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
