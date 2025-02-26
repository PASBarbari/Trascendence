FROM python:3.14-rc-bookworm

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev

COPY ./Notifications /Notifications
COPY ./requirements.txt /Notifications/requirements.txt
WORKDIR /Notifications

RUN pip install --upgrade pip
RUN pip install -r requirements.txt

EXPOSE 8000

COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]