# syntax=docker/dockerfile:1

FROM ruby:3.2-alpine
WORKDIR /workspace

RUN apk add --no-cache \
    build-base \
    git \
    curl \
    bash \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

COPY Gemfile /workspace
RUN bundle install

