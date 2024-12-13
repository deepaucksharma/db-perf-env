FROM grafana/k6:latest

# Copy test scripts
COPY scripts/ /scripts/

WORKDIR /scripts

# Default command to run k6
CMD ["run", "load-test.js"]