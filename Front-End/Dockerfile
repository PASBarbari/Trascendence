FROM node:lts-alpine
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Fix permissions for node user
RUN mkdir -p /app/.vite && \
	chmod -R 777 /app

# Expose Vite dev server port
EXPOSE 3000

# Run as non-root user

USER node

# Dev command with proper arguments and force new fs instance
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000", "--force"]

# Production build stage
# FROM node:lts-alpine AS build
# WORKDIR /app
# COPY package*.json ./
# RUN npm install
# COPY . .
# RUN npm run build

# Production runtime
# FROM nginx:alpine AS prod
# COPY --from=build /app/dist /usr/share/nginx/html
# EXPOSE 80
# CMD ["nginx", "-g", "daemon off;"]