#!/bin/bash
set -eo pipefail

MYSQL_USER=${MYSQL_HEALTHCHECK_USER:-$MYSQL_USER}
MYSQL_PASS=${MYSQL_HEALTHCHECK_PASSWORD:-$MYSQL_PASSWORD}

if ! mysqladmin ping -h"localhost" -u"$MYSQL_USER" -p"$MYSQL_PASS" --silent; then
    exit 1
fi

mysql -u"$MYSQL_USER" -p"$MYSQL_PASS" -e "SELECT 1;" >/dev/null 2>&1
exit $?
