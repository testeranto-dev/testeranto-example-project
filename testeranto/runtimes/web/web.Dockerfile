# syntax=docker/dockerfile:1

FROM node:20.19.4-alpine as build
WORKDIR /workspace
COPY ./tsconfig*.json ./
COPY package.json /workspace
COPY ./.yarnrc.yml ./
COPY ./eslint.config.mjs ./

# DO NOT DO THIS
# COPY projects/testeranto/testeranto/src/lib/tiposkripto/ ./projects/testeranto/testeranto/src/lib/tiposkripto/

# RUN apt-get update

# RUN apk add --no-cache 

# Install the native ARM64 version of Chromium
RUN apk add --no-cache socat \
    libc6-compat \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    libstdc++ \
    chromium-chromedriver \
    python3 libxml2-utils make build-base g++ git pkgconfig 

# RUN apt-get install -y socat


RUN ln -sf python3 /usr/bin/python
ENV npm_config_python=/usr/bin/python3
ENV PYTHON=/usr/bin/python3
RUN yarn install 

# Ensure Puppeteer knows exactly where the native binary is
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

EXPOSE 9222
