#!/bin/sh
set -e

load_secret_file() {
  var_name="$1"
  file_path="$2"

  if [ -f "$file_path" ]; then
    export "$var_name=$(tr -d '\n\r' < "$file_path")"
  else
    echo "ERROR: file '$file_path' specified in ${var_name}_FILE does not exist" >&2
    exit 1
  fi
}

# Load any secret files specified
[ -n "$GOMP_DATABASE_URL_FILE" ] && load_secret_file "GOMP_DATABASE_URL" "$GOMP_DATABASE_URL_FILE"
[ -n "$DATABASE_URL_FILE"      ] && load_secret_file "DATABASE_URL"      "$DATABASE_URL_FILE"
[ -n "$GOMP_SECURE_KEY_FILE"   ] && load_secret_file "GOMP_SECURE_KEY"   "$GOMP_SECURE_KEY_FILE"
[ -n "$SECURE_KEY_FILE"        ] && load_secret_file "SECURE_KEY"        "$SECURE_KEY_FILE"

if [ "${GOMP_DATABASE_SKIP_MIGRATION:-${DATABASE_SKIP_MIGRATION:-false}}" != "true" ]; then
  ./gomp db migrate up
fi

exec ./gomp "$@"
