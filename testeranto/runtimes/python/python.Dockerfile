FROM python:3.11-alpine
WORKDIR /workspace

# Install system dependencies needed for building Python packages
RUN apk add --no-cache \
    gcc \
    musl-dev \
    python3-dev \
    libffi-dev \
    openssl-dev \
    cargo \
    git \
    && rm -rf /var/cache/apk/*

# Copy the entire project
# COPY . /workspace/
COPY requirements.txt .

# Install dependencies from requirements.txt
# RUN pip install
RUN python3 -m pip install -r requirements.txt

# Set PYTHONPATH to include the workspace
ENV PYTHONPATH=/workspace:$PYTHONPATH

# Default command
CMD ["python3"]
