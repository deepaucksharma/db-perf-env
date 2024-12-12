FROM mcr.microsoft.com/mssql-tools:latest

RUN apt-get update && apt-get install -y python3 python3-pip && apt-get clean

WORKDIR /app
COPY requirements.txt .
RUN pip3 install -r requirements.txt

COPY migrations/ migrations/
COPY scripts/ scripts/
