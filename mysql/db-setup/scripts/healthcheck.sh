#!/bin/bash
set -eo pipefail

if ! mysqladmin ping -h"localhost" -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" --silent; then
    exit 1
fi

mysql -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" -e "SELECT 1;" >/dev/null 2>&1
exit $?