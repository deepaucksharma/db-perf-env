FROM grafana/k6:latest

# Copy test scripts
COPY scripts/ /scripts/

WORKDIR /scripts

ENV API_URL=http://api:3000 \
    K6_VUS=50 \
    K6_DURATION=30m

# Run load test
CMD ["run", "load-test.js"]