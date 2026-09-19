#!/bin/sh
# Exercises docker-entrypoint.sh GOMP_ prefix handling without a real gomp binary.
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT
cd "$workdir"

stub_gomp() {
  cat > gomp <<'EOF'
#!/bin/sh
if [ "$1" = db ]; then
  echo migrate >> "$GOMP_TEST_LOG"
  exit 0
fi
printf 'DATABASE_URL=%s\n' "${DATABASE_URL-}" >> "$GOMP_TEST_LOG"
printf 'GOMP_DATABASE_URL=%s\n' "${GOMP_DATABASE_URL-}" >> "$GOMP_TEST_LOG"
printf 'SECURE_KEY=%s\n' "${SECURE_KEY-}" >> "$GOMP_TEST_LOG"
printf 'GOMP_SECURE_KEY=%s\n' "${GOMP_SECURE_KEY-}" >> "$GOMP_TEST_LOG"
EOF
  chmod +x gomp
}

run_ep() {
  GOMP_TEST_LOG="$workdir/log" sh "$root/docker-entrypoint.sh" serve
}

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "ok: $*"; }

# unprefixed *_FILE
stub_gomp
printf 'postgres://plain\n' > url.txt
printf 'plain-key\n' > key.txt
: > log
DATABASE_URL_FILE="$workdir/url.txt" SECURE_KEY_FILE="$workdir/key.txt" DATABASE_SKIP_MIGRATION=true \
  GOMP_TEST_LOG="$workdir/log" sh "$root/docker-entrypoint.sh" serve
grep -q 'DATABASE_URL=postgres://plain' log || fail "unprefixed DATABASE_URL_FILE"
grep -q 'SECURE_KEY=plain-key' log || fail "unprefixed SECURE_KEY_FILE"
grep -q migrate log && fail "skip migration unprefixed"
pass "unprefixed *_FILE and skip"

# GOMP_ prefix
: > log
printf 'postgres://gomp\n' > url-g.txt
printf 'gomp-key\n' > key-g.txt
GOMP_DATABASE_URL_FILE="$workdir/url-g.txt" GOMP_SECURE_KEY_FILE="$workdir/key-g.txt" GOMP_DATABASE_SKIP_MIGRATION=true \
  GOMP_TEST_LOG="$workdir/log" sh "$root/docker-entrypoint.sh" serve
grep -q 'DATABASE_URL=postgres://gomp' log || fail "GOMP_ DATABASE_URL_FILE"
grep -q 'GOMP_DATABASE_URL=postgres://gomp' log || fail "export GOMP_DATABASE_URL"
grep -q 'SECURE_KEY=gomp-key' log || fail "GOMP_ SECURE_KEY_FILE"
grep -q migrate log && fail "skip migration GOMP_"
pass "GOMP_ *_FILE and skip"

# GOMP_ wins when both are set
: > log
printf 'postgres://loser\n' > url-l.txt
printf 'postgres://winner\n' > url-w.txt
DATABASE_URL_FILE="$workdir/url-l.txt" GOMP_DATABASE_URL_FILE="$workdir/url-w.txt" \
  DATABASE_SKIP_MIGRATION=true GOMP_DATABASE_SKIP_MIGRATION=true \
  GOMP_TEST_LOG="$workdir/log" sh "$root/docker-entrypoint.sh" serve
grep -q 'DATABASE_URL=postgres://winner' log || fail "GOMP_ prefix should win"
pass "GOMP_ prefix preferred over unprefixed"

# missing file uses the name that was set
: > log
if GOMP_DATABASE_URL_FILE="$workdir/missing.txt" DATABASE_SKIP_MIGRATION=true \
  GOMP_TEST_LOG="$workdir/log" sh "$root/docker-entrypoint.sh" serve 2>err; then
  fail "expected missing file to exit"
fi
grep -q 'GOMP_DATABASE_URL_FILE' err || fail "error should name GOMP_DATABASE_URL_FILE"
pass "missing GOMP_ file error names the env var"

# default still migrates
: > log
GOMP_TEST_LOG="$workdir/log" sh "$root/docker-entrypoint.sh" serve
grep -q migrate log || fail "default should migrate"
pass "default migrates"

echo "all docker-entrypoint tests passed"
