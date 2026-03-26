# Stage 1: Build the React application
FROM node:24-bookworm-slim AS build

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the app source code
COPY . .

# Build the app 
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the built assets from the build stage to Nginx's default public directory
# Note: Vite builds into the 'dist' directory by default
COPY --from=build /app/dist /usr/share/nginx/html

# Copy a custom nginx config if we had one, but default works for simple static hosting
# We may need to configure nginx to proxy routes to index.html for react-router, 
# but for now we'll rely on default if no custom config is provided. If using React Router,
# we should ideally add an Nginx configuration to support client-side routing.
RUN rm /etc/nginx/conf.d/default.conf
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose port 80 for the Nginx server
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
