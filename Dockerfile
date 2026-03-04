# Meta Python - AST Visualizer
# Multi-stage build for optimized image

FROM nginx:alpine

LABEL maintainer="Meta Python Project"
LABEL description="AST Visualizer with Pyodide"

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy web files
COPY web/ /usr/share/nginx/html/

# Copy Python source modules (for reference/download)
COPY src/ /usr/share/nginx/html/python/src/

# Create health check endpoint
RUN echo "OK" > /usr/share/nginx/html/health

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run nginx
CMD ["nginx", "-g", "daemon off;"]
