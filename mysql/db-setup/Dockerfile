FROM mysql:8.0

# Install required utilities
RUN microdnf update && \
    microdnf install -y curl python3 python3-pip && \
    microdnf clean all

# Create required directories and set permissions
RUN mkdir -p /docker-entrypoint-initdb.d /flyway/sql /scripts /var/log/mysql /var/lib/mysql-files && \
    chown mysql:mysql /var/log/mysql && \
    chown mysql:mysql /var/lib/mysql-files && \
    chmod 750 /var/log/mysql && \
    chmod 750 /var/lib/mysql-files

# Copy Flyway migrations
COPY flyway/sql/ /flyway/sql/

# Copy Python scripts and requirements
COPY scripts/ /scripts/
COPY requirements.txt /scripts/

# Copy configuration files and set permissions
COPY config/mysql.cnf /etc/mysql/conf.d/
RUN chmod 644 /etc/mysql/conf.d/*.cnf && \
    chown -R mysql:mysql /etc/mysql/conf.d/

# Install Python dependencies
RUN pip3 install --no-cache-dir -r /scripts/requirements.txt

# Copy custom initialization script
COPY scripts/init-db.sh /docker-entrypoint-initdb.d/

# Set permissions
RUN chmod +x /docker-entrypoint-initdb.d/init-db.sh && \
    chmod -R 755 /scripts

EXPOSE 3306

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD mysqladmin ping -h"localhost" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" --silent