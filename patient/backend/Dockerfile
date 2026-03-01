# Clinical Intelligence Platform - Backend
FROM node:20-alpine

# Install Python and build dependencies for PyMuPDF and bcrypt
RUN apk add --no-cache python3 py3-pip build-base python3-dev make g++

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

# Copy extraction requirements and install
COPY extraction-service/requirements.txt ./extraction-service/
RUN pip install --no-cache-dir -r extraction-service/requirements.txt --break-system-packages

COPY . .

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 5000

CMD ["node", "server.js"]
