# Use a stable Python version
FROM python:3.11-alpine AS base

# Runtime dependencies
RUN apk add --no-cache postgresql-libs libgomp libstdc++

FROM base AS builder

# Build dependencies - these are needed for scikit-learn
RUN apk add --no-cache postgresql-dev gcc g++ python3-dev musl-dev \
    openblas-dev lapack-dev gfortran linux-headers

RUN mkdir -p /install
WORKDIR /install

COPY requirements.txt .

# Install numpy first to help with scikit-learn build
RUN pip install --no-cache-dir --prefix=/install numpy

# Then install the rest
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM base

COPY --from=builder /install /usr/local/lib/python3.11/site-packages/
COPY . /app
WORKDIR /app

COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000
CMD [ "sh", "/entrypoint.sh" ]