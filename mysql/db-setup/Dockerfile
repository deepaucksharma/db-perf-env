FROM mysql:8.0

COPY my.cnf /etc/mysql/conf.d/
COPY init.sql /docker-entrypoint-initdb.d/

RUN chmod 0644 /etc/mysql/conf.d/my.cnf && \
    chown mysql:mysql /etc/mysql/conf.d/my.cnf

CMD ["mysqld"]
