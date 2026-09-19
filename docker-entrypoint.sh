#!/bin/sh
set -e

# Prefer GOMP_ prefix if both are present, matching the Go config loader.
env_get() {
  name="$1"
  eval "gomp_val=\${GOMP_${name}-}"
  eval "plain_val=\${${name}-}"
  if [ -n "$gomp_val" ]; then
    printf '%s' "$gomp_val"
  else
    printf '%s' "$plain_val"
  fi
}

env_source_name() {
  name="$1"
  eval "gomp_val=\${GOMP_${name}-}"
  if [ -n "$gomp_val" ]; then
    printf 'GOMP_%s' "$name"
  else
    printf '%s' "$name"
  fi
}

load_secret_file() {
  var_name="$1"
  file_path="$2"
  source_name="$3"

  if [ -f "$file_path" ]; then
    val=$(tr -d '\n\r' < "$file_path")
    export "$var_name=$val"
    export "GOMP_$var_name=$val"
  else
    echo "ERROR: file '$file_path' specified in ${source_name} does not exist" >&2
    exit 1
  fi
}

# Load any secret files specified (DATABASE_URL_FILE / SECURE_KEY_FILE, with optional GOMP_ prefix)
url_file=$(env_get DATABASE_URL_FILE)
if [ -n "$url_file" ]; then
  load_secret_file "DATABASE_URL" "$url_file" "$(env_source_name DATABASE_URL_FILE)"
fi
key_file=$(env_get SECURE_KEY_FILE)
if [ -n "$key_file" ]; then
  load_secret_file "SECURE_KEY" "$key_file" "$(env_source_name SECURE_KEY_FILE)"
fi

skip=$(env_get DATABASE_SKIP_MIGRATION)
if [ "${skip:-false}" != "true" ]; then
  ./gomp db migrate up
fi

exec ./gomp "$@"
