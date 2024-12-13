# Use an official MySQL runtime as a parent image
FROM mysql:8.0

# Set environment variables
ENV MYSQL_ROOT_PASSWORD=root_password

# Copy Flyway migrations
COPY db/migrations/ /flyway/sql/

# Copy scripts
COPY db/scripts/ /scripts/

# Copy configs
COPY db/config/mysql.cnf /etc/mysql/conf.d/

# Install Flyway
RUN apt-get update && apt-get install -y flyway

# Set up entrypoint
ENTRYPOINT ["/scripts/init-db.sh"]
