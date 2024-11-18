FROM postgres:latest

ENV POSTGRES_USER=pasquale
ENV POSTGRES_DB=usertask_db
ENV POSTGRES_PASSWORD=123

EXPOSE 5432

COPY ./init.sql /docker-entrypoint-initdb.d/
