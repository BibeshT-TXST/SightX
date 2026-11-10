# Stage 1: Build the React application
FROM node:20-bookworm-slim AS build

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copy the rest of the app source code
COPY . .

# Build the app (Vite bakes the API URL into the bundle)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the built assets from the build stage to Nginx's default public directory
# Note: Vite builds into the 'dist' directory by default
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration to support React Router client-side routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for the Nginx server
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
