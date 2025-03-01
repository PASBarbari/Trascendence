# Use a stable Python version
FROM python:3.11-alpine AS base

RUN apk add --no-cache postgresql-libs

FROM base AS builder

RUN mkdir -p /install
WORKDIR /install

COPY requirements.txt .

RUN pip install --target=/install -r requirements.txt

FROM base

COPY --from=builder /install /usr/local/lib/python3.11/site-packages/
COPY . /app
WORKDIR /app

RUN python3 -m pip install daphne

COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000
CMD [ "sh", "/entrypoint.sh" ]