# Use an official Node.js runtime as a parent image
FROM node:16-alpine

# Install Yarn
RUN apk add --no-cache yarn

# Set the working directory to /app
WORKDIR /app

# Copy the package.json and yarn.lock files to the container
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy the rest of the application code to the container
COPY . .

# Copy .file.env.production file to the container
COPY .file.env.production .

# Read environment variables from .file.env.production file
ENV $(cat .file.env.production | xargs)
ENV PORT=8080
ENV HOST=0.0.0.0

# Copy Prisma configuration files
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN yarn build

# Expose port 8080 for the application
EXPOSE 8080

# Start the application
CMD [ "yarn", "start" ]
