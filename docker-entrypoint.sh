#!/bin/sh
set -e

load_secret_file() {
  if [ -f "$2" ]; then
    export "$1=$(tr -d '\n\r' < "$2")"
  else
    echo "ERROR: file '$2' specified in ${1}_FILE does not exist" >&2
    exit 1
  fi
}

# Load any secret files specified
[ -n "$DATABASE_URL_FILE" ] && load_secret_file "DATABASE_URL" "$DATABASE_URL_FILE"
[ -n "$SECURE_KEY_FILE" ] && load_secret_file "SECURE_KEY" "$SECURE_KEY_FILE"

if [ $# -gt 0 ]; then
  exec ./gomp "$@"
else
  # First migrate the DB
  ./gomp db migrate up
  # Then serve the application
  exec ./gomp serve
fi