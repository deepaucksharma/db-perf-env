#!/usr/bin/env bash
set -e

# This script runs after initdb but before the server starts.
# Copy custom configs into the data directory
cp /etc/postgresql/postgresql.conf $PGDATA/postgresql.conf
cp /etc/postgresql/pg_hba.conf $PGDATA/pg_hba.conf

chown postgres:postgres $PGDATA/postgresql.conf $PGDATA/pg_hba.conf
chmod 0600 $PGDATA/postgresql.conf $PGDATA/pg_hba.conf

echo "Custom configuration applied."