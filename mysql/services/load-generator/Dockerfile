FROM grafana/k6:latest

COPY scripts/ /scripts/
WORKDIR /scripts

ENV API_URL=http://api:3000
ENV K6_VUS=10
ENV K6_DURATION=5m

CMD ["run", "load-test.js"]
