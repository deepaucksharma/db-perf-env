FROM mysql:8.0

# Install prerequisites
RUN microdnf update && \
    microdnf install -y \
    python3 \
    python3-pip \
    && microdnf clean all

# Install New Relic Python agent
RUN pip3 install newrelic

ENV TZ=UTC

# Python requirements
COPY requirements.txt /tmp/
RUN pip3 install --no-cache-dir -r /tmp/requirements.txt

# Copy configs with proper permissions
COPY configs/ /etc/mysql/conf.d/
RUN chown -R mysql:mysql /etc/mysql/conf.d/ && \
    chmod 0444 /etc/mysql/conf.d/*.cnf

# Copy initialization scripts
COPY scripts/init.sql /docker-entrypoint-initdb.d/01-init.sql
COPY scripts/schemas.sql /docker-entrypoint-initdb.d/02-schemas.sql
COPY scripts/indexes.sql /docker-entrypoint-initdb.d/03-indexes.sql
COPY scripts/views.sql /docker-entrypoint-initdb.d/04-views.sql
COPY scripts/load_data.py /docker-entrypoint-initdb.d/05-load_data.py

# Set correct permissions
RUN chown -R mysql:mysql /docker-entrypoint-initdb.d && \
    chmod 0444 /docker-entrypoint-initdb.d/*.sql && \
    chmod 0555 /docker-entrypoint-initdb.d/*.py

EXPOSE 3306

# Use the official entrypoint script
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["mysqld"]
