FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV DATA_DIR=/app/data
RUN mkdir -p /app/data
EXPOSE 8080
CMD ["node", "server.js"]
