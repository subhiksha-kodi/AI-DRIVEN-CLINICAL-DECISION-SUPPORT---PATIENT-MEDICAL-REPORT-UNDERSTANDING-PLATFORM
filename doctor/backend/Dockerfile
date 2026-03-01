# Clinical Intelligence Platform - Backend
FROM node:20

# Install Python and build dependencies for PyMuPDF
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*
    
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
