FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Data (app.db + uploads) lives here — declared as a volume so it survives
# container recreation / redeploys when a named or bind volume is mounted.
ENV DATA_DIR=/app/data
RUN mkdir -p /app/data
VOLUME /app/data
EXPOSE 8080
CMD ["node", "server.js"]
