FROM postgres:15

# Install prerequisites
RUN apt-get update && \
    apt-get install -y python3 python3-pip tzdata && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install New Relic Python agent
RUN pip3 install --no-cache-dir newrelic

ENV TZ=UTC

# Python requirements
COPY requirements.txt /tmp/requirements.txt
RUN pip3 install --no-cache-dir -r /tmp/requirements.txt

# Copy PostgreSQL config files
# We'll store main configs in /etc/postgresql/ and a custom conf.d/ directory for included configs
RUN mkdir -p /etc/postgresql/conf.d
COPY configs/pg_hba.conf /etc/postgresql/pg_hba.conf
COPY configs/postgresql.conf /etc/postgresql/postgresql.conf
COPY configs/conf.d/custom.conf /etc/postgresql/conf.d/custom.conf

# Copy migrations and scripts
COPY migrations/*.sql /docker-entrypoint-initdb.d/
COPY scripts/*.py /docker-entrypoint-initdb.d/
COPY scripts/*.sh /docker-entrypoint-initdb.d/

# Set correct permissions
RUN chown -R postgres:postgres /etc/postgresql && \
    chmod 0444 /etc/postgresql/pg_hba.conf && \
    chmod 0444 /etc/postgresql/postgresql.conf && \
    chmod 0444 /etc/postgresql/conf.d/custom.conf && \
    chown -R postgres:postgres /docker-entrypoint-initdb.d && \
    chmod 0444 /docker-entrypoint-initdb.d/*.sql && \
    chmod 0555 /docker-entrypoint-initdb.d/*.py && \
    chmod 0555 /docker-entrypoint-initdb.d/*.sh

EXPOSE 5432