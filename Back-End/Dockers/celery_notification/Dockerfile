FROM python:3.9-slim


WORKDIR /app
COPY ./requirements.txt /app/requirements.txt

RUN pip3 install --upgrade pip
RUN pip3 install -r requirements.txt

ENV CELERY_BROKER_URL redis://redis_notification:6379/0
ENV CELERY_RESULT_BACKEND redis://redis_notification:6379/0

RUN sleep 20

CMD ["celery", "-A", "notification", "worker", "--loglevel=info"]