# Use a stable Python version
FROM python:3.11-alpine AS base

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

EXPOSE 8000
CMD [ "/bin/bash","/entrypoint.sh" ]