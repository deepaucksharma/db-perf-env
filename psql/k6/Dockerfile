FROM grafana/k6:latest

COPY scripts/load-test.js /scripts/load-test.js

ENTRYPOINT ["k6", "run"]
CMD ["/scripts/load-test.js"]
