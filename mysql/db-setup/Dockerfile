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

# Copy files in specific order
COPY migrations/V1__init_monitoring.sql /docker-entrypoint-initdb.d/
COPY migrations/V2__create_base_schema.sql /docker-entrypoint-initdb.d/
COPY migrations/V3__add_indexes.sql /docker-entrypoint-initdb.d/
COPY migrations/V4__create_views.sql /docker-entrypoint-initdb.d/
COPY scripts/load_data.py /docker-entrypoint-initdb.d/
COPY scripts/run_load_data.sh /docker-entrypoint-initdb.d/

# Set correct permissions
RUN chown -R mysql:mysql /docker-entrypoint-initdb.d && \
    chmod 0444 /docker-entrypoint-initdb.d/*.sql && \
    chmod 0555 /docker-entrypoint-initdb.d/load_data.py && \
    chmod 0555 /docker-entrypoint-initdb.d/run_load_data.sh

EXPOSE 3306
