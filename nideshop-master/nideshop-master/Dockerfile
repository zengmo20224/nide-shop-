FROM node:18-alpine

WORKDIR /app

# Copy pre-compiled app + package info
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy compiled code and source
COPY app/ app/
COPY src/ src/
COPY production.js ./
COPY development.js ./
COPY www/ www/

EXPOSE 8360

CMD ["node", "production.js"]
