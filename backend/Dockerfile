# Use the official Node.js 20 image (LTS)
FROM --platform=arm64 node:20-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package files first (helps with layer caching)
COPY package*.json ./

# Install only production dependencies for a lighter image
RUN npm ci --omit=dev

# Copy the rest of your backend source code
COPY . .

# Expose the port your server runs on
EXPOSE 5000

# Use the 'start' script to run node directly instead of nodemon
CMD ["npm", "start"]