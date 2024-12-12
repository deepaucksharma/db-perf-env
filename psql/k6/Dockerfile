FROM grafana/k6:latest
COPY scripts/ /scripts/
ENTRYPOINT ["k6", "run"]
CMD ["/scripts/load-test.js"]