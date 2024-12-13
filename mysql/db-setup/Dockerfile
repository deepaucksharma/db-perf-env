FROM mysql:8.0

# Install required utilities
RUN microdnf update && \
    microdnf install -y curl python3 python3-pip && \
    microdnf clean all

# Create required directories
RUN mkdir -p /var/log/mysql /scripts /docker-entrypoint-initdb.d && \
    chown mysql:mysql /var/log/mysql && \
    chmod 755 /var/log/mysql

# Copy configuration files
COPY config/ /etc/mysql/conf.d/
RUN chown -R mysql:mysql /etc/mysql/conf.d/ && \
    chmod 0444 /etc/mysql/conf.d/*.cnf

# Copy SQL initialization files
COPY migrations/V1__init_monitoring.sql \
     migrations/V2__create_base_schema.sql \
     migrations/V3__add_indexes.sql \
     migrations/V4__create_views.sql \
     /docker-entrypoint-initdb.d/

# Copy Python scripts and requirements
COPY scripts/ /scripts/
COPY requirements.txt /scripts/

# Install Python dependencies
RUN pip3 install --no-cache-dir -r /scripts/requirements.txt && \
    rm -rf /root/.cache/pip

# Create data initialization script
RUN echo '#!/bin/bash' > /docker-entrypoint-initdb.d/zz_init_data.sh && \
    echo 'set -e' >> /docker-entrypoint-initdb.d/zz_init_data.sh && \
    echo 'echo "Waiting for MySQL to be ready..."' >> /docker-entrypoint-initdb.d/zz_init_data.sh && \
    echo 'sleep 10' >> /docker-entrypoint-initdb.d/zz_init_data.sh && \
    echo 'echo "Starting data initialization..."' >> /docker-entrypoint-initdb.d/zz_init_data.sh && \
    echo 'python3 /scripts/create_tables.py' >> /docker-entrypoint-initdb.d/zz_init_data.sh && \
    echo 'python3 /scripts/departments_data.py' >> /docker-entrypoint-initdb.d/zz_init_data.sh && \
    echo 'python3 /scripts/load_data.py' >> /docker-entrypoint-initdb.d/zz_init_data.sh && \
    chmod +x /docker-entrypoint-initdb.d/zz_init_data.sh

# Create healthcheck script
RUN echo '#!/bin/bash' > /healthcheck.sh && \
    echo 'mysqladmin ping -h"localhost" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" --silent' >> /healthcheck.sh && \
    chmod +x /healthcheck.sh

EXPOSE 3306

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD ["/healthcheck.sh"]

CMD ["mysqld"]