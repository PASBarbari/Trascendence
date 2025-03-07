# Use a stable Python version
FROM python:3.11-alpine AS base

FROM base AS builder

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

FROM base

COPY --from=builder /usr/local /usr/local

COPY . /app
WORKDIR /app

EXPOSE 8000
CMD [ "gunicorn", "--bind", "0.0.0.0:8000", "jwt_validator.wsgi:application" ]