# Use a stable Python version
FROM python:3.13-alpine AS base

RUN apk add --no-cache postgresql-libs bash

FROM base AS builder

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

FROM base

COPY --from=builder /usr/local /usr/local

COPY . /app
WORKDIR /app

COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create non-root user
RUN adduser -D -s /bin/bash docs
RUN chown -R docs:docs /app
USER docs

EXPOSE 8005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8005/health/', timeout=5)" || exit 1

CMD [ "/bin/bash","/entrypoint.sh" ]
