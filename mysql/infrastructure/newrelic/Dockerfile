# infrastructure/newrelic/Dockerfile

# Build stage for nri-mysql using a specific commit and modifying code
FROM golang:1.23-alpine AS builder

# Install git and build essentials
RUN apk add --no-cache git make

# Hardcode the integration ref
ARG MYSQL_INTEGRATION_REF=703b1f6

WORKDIR /go/src/github.com/newrelic/nri-mysql

# Clone the repository at the specified commit
RUN git clone https://github.com/spathlavath/nri-mysql.git . && \
    git checkout ${MYSQL_INTEGRATION_REF}

# Use sed to remove the conditional block and always call PopulateQueryPerformanceMetrics
RUN sed -i '/if args.EnableQueryPerformanceMonitoring {/,/}/c\query_performance_details.PopulateQueryPerformanceMetrics(args, e, i)' src/mysql.go

# Compile the modified binary
RUN make compile

# Final stage
FROM newrelic/infrastructure-bundle:latest

# Backup original binary if it exists
RUN if [ -f /var/db/newrelic-infra/newrelic-integrations/bin/nri-mysql ]; then \
    mv /var/db/newrelic-infra/newrelic-integrations/bin/nri-mysql /var/db/newrelic-infra/newrelic-integrations/bin/nri-mysql.bak; \
    fi

# Copy the compiled binary from builder
COPY --from=builder /go/src/github.com/newrelic/nri-mysql/bin/nri-mysql /var/db/newrelic-infra/newrelic-integrations/bin/

# Set correct permissions
RUN chmod 755 /var/db/newrelic-infra/newrelic-integrations/bin/nri-mysql

# Verify binary works
RUN /var/db/newrelic-infra/newrelic-integrations/bin/nri-mysql -show_version

ENTRYPOINT ["/usr/bin/newrelic-infra"]
