FROM grafana/k6:latest
COPY scripts/ /scripts/
WORKDIR /scripts
CMD ["run", "k6-script.js"]