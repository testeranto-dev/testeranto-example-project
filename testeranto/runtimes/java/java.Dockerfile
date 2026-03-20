# syntax=docker/dockerfile:1
FROM eclipse-temurin:17-jdk-jammy

WORKDIR /workspace

# Install system dependencies needed for building Java projects
RUN apt-get update && apt-get install -y \
    maven \
    git \
    curl \
    wget \
    bash \
    python3 \
    make \
    g++ \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Gradle 8.8 (better Java 17 compatibility)
RUN wget -O /tmp/gradle.zip https://services.gradle.org/distributions/gradle-8.8-bin.zip \
    && unzip -d /opt /tmp/gradle.zip \
    && ln -s /opt/gradle-8.8/bin/gradle /usr/bin/gradle \
    && rm /tmp/gradle.zip

# Install JSON library for Java builder (still needed for java_runtime)
RUN wget -O /tmp/json.jar https://repo1.maven.org/maven2/org/json/json/20231013/json-20231013.jar \
    && mkdir -p /workspace/lib \
    && mv /tmp/json.jar /workspace/lib/

# Set up Java classpath for java_runtime
ENV CLASSPATH="/workspace/lib/*:."
# Set Gradle options to fix Java 17 module access issues
ENV GRADLE_OPTS="--add-opens java.base/java.lang=ALL-UNNAMED --add-opens java.base/java.lang.invoke=ALL-UNNAMED --add-opens java.base/java.util=ALL-UNNAMED"

# Ensure a build.gradle exists in /workspace with proper source sets
RUN cd /workspace && \
    if [ ! -f build.gradle ]; then \
        echo "Creating minimal build.gradle..." && \
        echo "plugins { id 'java' }" > build.gradle && \
        echo "repositories { mavenCentral() }" >> build.gradle && \
        echo "sourceSets {" >> build.gradle && \
        echo "    main {" >> build.gradle && \
        echo "        java {" >> build.gradle && \
        echo "            srcDirs = ['src/java/main/java']" >> build.gradle && \
        echo "        }" >> build.gradle && \
        echo "    }" >> build.gradle && \
        echo "    test {" >> build.gradle && \
        echo "        java {" >> build.gradle && \
        echo "            srcDirs = ['src/java/test/java']" >> build.gradle && \
        echo "        }" >> build.gradle && \
        echo "    }" >> build.gradle && \
        echo "}" >> build.gradle; \
    else \
        echo "build.gradle already exists, keeping it."; \
    fi

# Copy other files from build context if they exist
# Use shell commands to copy files if they exist, without complex shell syntax
# First, create a temporary script to handle the copying
RUN echo '#!/bin/bash' > /tmp/copy_files.sh && \
    echo 'if [ -f gradle.properties ]; then cp gradle.properties /workspace/; else echo "gradle.properties not found, skipping"; fi' >> /tmp/copy_files.sh && \
    echo 'if [ -f settings.gradle ]; then cp settings.gradle /workspace/; else echo "settings.gradle not found, skipping"; fi' >> /tmp/copy_files.sh && \
    echo 'if [ -f gradlew ]; then cp gradlew /workspace/; else echo "gradlew not found, skipping"; fi' >> /tmp/copy_files.sh && \
    echo 'if [ -d gradle ]; then cp -r gradle /workspace/; else echo "gradle directory not found, skipping"; fi' >> /tmp/copy_files.sh && \
    chmod +x /tmp/copy_files.sh && \
    /tmp/copy_files.sh && \
    rm /tmp/copy_files.sh

# Make gradlew executable if it exists
RUN if [ -f /workspace/gradlew ]; then chmod +x /workspace/gradlew; fi

# Skip downloading dependencies during build to avoid network issues
# The dependencies will be downloaded at runtime

# No CMD - command will be provided by docker-compose via java/docker.ts
