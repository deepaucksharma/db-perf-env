# Build stage for nri-postgresql
FROM golang:1.21-alpine AS builder

# Install git and build essentials
RUN apk add --no-cache git make

# Set working directory
WORKDIR /go/src/github.com/newrelic

# Clone specific branch of nri-postgresql
ARG POSTGRES_INTEGRATION_BRANCH=master
RUN git clone -b ${POSTGRES_INTEGRATION_BRANCH} https://github.com/newrelic/nri-postgresql.git

# Build the integration
WORKDIR /go/src/github.com/newrelic/nri-postgresql
RUN make compile

# Final stage with New Relic infrastructure bundle
FROM newrelic/infrastructure-bundle:latest

# Copy the compiled binary from builder
COPY --from=builder /go/src/github.com/newrelic/nri-postgresql/bin/nri-postgresql /var/db/newrelic-infra/newrelic-integrations/bin/

# Set correct permissions
RUN chmod 755 /var/db/newrelic-infra/newrelic-integrations/bin/nri-postgresql

# Keep the rest of the infrastructure bundle configuration
ENTRYPOINT ["/usr/bin/newrelic-infra"]
