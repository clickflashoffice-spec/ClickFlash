# ClickFlash Master Service Dockerfile

FROM ubuntu:24.04

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    curl \
    zip \
    unzip \
    tar \
    pkg-config \
    libsqlite3-dev \
    libssl-dev \
    libjsoncpp-dev \
    && rm -rf /var/lib/apt/lists/*

# Install vcpkg
RUN git clone https://github.com/microsoft/vcpkg.git /opt/vcpkg \
    && /opt/vcpkg/bootstrap-vcpkg.sh \
    && ln -s /opt/vcpkg/vcpkg /usr/local/bin/vcpkg

# Set working directory
WORKDIR /app

# Copy source code
COPY . .

# Install dependencies via vcpkg
RUN vcpkg install --triplet x64-linux

# Build
RUN cmake -B build \
    -DCMAKE_TOOLCHAIN_FILE=/opt/vcpkg/scripts/buildsystems/vcpkg.cmake \
    -DVCPKG_TARGET_TRIPLET=x64-linux \
    -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build --config Release --parallel

# Runtime stage
FROM ubuntu:24.04

RUN apt-get update && apt-get install -y \
    libsqlite3-0 \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy binary and migrations
COPY --from=0 /app/build/ClickFlashMasterService /app/
COPY --from=0 /app/migrations /app/migrations

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 8090

# Environment variables
ENV CF_DB_PATH=/app/data/clickflash.db
ENV CF_MIGRATIONS_DIR=/app/migrations
ENV CF_PORT=8090
ENV CF_THREADS=4

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8090/api/health || exit 1

# Run
CMD ["/app/ClickFlashMasterService"]
