FROM alpine:latest

# Set the Loki version to download
ARG LOKI_VERSION=2.9.2

# Install necessary tools
RUN apk add --no-cache curl unzip

# Download and extract the prebuilt Loki binary
ADD https://github.com/grafana/loki/releases/download/v${LOKI_VERSION}/loki-linux-amd64.zip /tmp/loki.zip
RUN unzip /tmp/loki.zip -d /usr/bin/ && rm /tmp/loki.zip && chmod +x /usr/bin/loki-linux-amd64 && mv /usr/bin/loki-linux-amd64 /usr/bin/loki

# Copy the Loki configuration file
COPY ./loki-config.yaml /etc/loki/local-config.yaml

# Set up the environment
RUN addgroup -g 10001 -S loki && \
    adduser -u 10001 -S loki -G loki && \
    mkdir -p /tmp/loki/compactor && \
    mkdir -p /tmp/loki/tsdb-index && \
    mkdir -p /tmp/loki/tsdb-cache && \
    mkdir -p /tmp/loki/chunks && \
    mkdir -p /var/lib/loki/compactor && \
    chown -R loki:loki /tmp/loki && \
    chown -R loki:loki /etc/loki && \
    chown -R loki:loki /var/lib/loki

USER 10001
EXPOSE 3100
ENTRYPOINT [ "/usr/bin/loki" ]
CMD ["-config.file=/etc/loki/local-config.yaml"]