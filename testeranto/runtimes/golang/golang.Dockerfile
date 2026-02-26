FROM golang:1.22
WORKDIR /workspace

# Copy go.mod and go.sum to ensure they exist in the image
# But note: the actual workspace will be mounted over /workspace at runtime
COPY go.mod go.sum /workspace/

# Download dependencies to cache them in the image
# Don't run go mod tidy here as it would modify the image's go.sum,
# but the mounted workspace will override it anyway
RUN go mod download
