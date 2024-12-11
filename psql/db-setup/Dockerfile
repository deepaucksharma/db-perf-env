FROM postgres:15

# Install prerequisites
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    wget \
    gnupg2 \
    curl \
    && rm -rf /var/lib/apt/lists/*

ENV TZ=UTC

# Python requirements
COPY requirements.txt /tmp/
RUN pip3 install --no-cache-dir -r /tmp/requirements.txt

# Copy configs
COPY config/postgresql.conf /etc/postgresql/postgresql.conf
COPY config/pg_hba.conf /etc/postgresql/pg_hba.conf

# Copy initialization scripts
COPY scripts/init.sql /docker-entrypoint-initdb.d/01-init.sql
COPY scripts/schema.sql /docker-entrypoint-initdb.d/02-schema.sql
COPY scripts/indexes.sql /docker-entrypoint-initdb.d/03-indexes.sql
COPY scripts/load_data.py /docker-entrypoint-initdb.d/04-load_data.py

RUN chmod +x /docker-entrypoint-initdb.d/*.py

EXPOSE 5432
