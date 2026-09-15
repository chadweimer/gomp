#!/bin/sh
set -e

load_secret_file() {
  local var_name="$1"
  local file_path="$2"

  if [[ -f "$file_path" ]]; then
    export "${var_name}"="$(cat "$file_path" | tr -d '\n' | tr -d '\r')"
  fi
}

# Load any secret files specified
if [[ -n "$DATABASE_URL_FILE" ]]; then
  load_secret_file "DATABASE_URL" "$DATABASE_URL_FILE"
fi
if [[ -n "$SECURE_KEY_FILE" ]]; then
  load_secret_file "SECURE_KEY" "$SECURE_KEY_FILE"
fi

# First migrate the DB
./gomp db migrate up

# Then serve the application
./gomp serve
