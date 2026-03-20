# syntax=docker/dockerfile:1
# Minimal Rust Dockerfile for Testeranto
# Source code is mounted via volumes at runtime

FROM rust:1.75-alpine3.19

WORKDIR /workspace

# Install system dependencies needed for building Rust projects
RUN apk add --no-cache \
    build-base \
    git \
    curl \
    bash \
    python3 \
    make \
    g++ \
    musl-dev \
    openssl-dev \
    pkgconfig \
    && rm -rf /var/cache/apk/*

# Pre-create target directory with proper permissions
RUN mkdir -p /workspace/target && chmod 777 /workspace/target

# Install additional tools that might be needed for testing
RUN cargo install --version 0.9.0 cargo-audit || true

# No need to build rusto from source - it will be downloaded as a dependency
# when building test binaries
# No CMD - command is specified in docker-compose
