#!/bin/sh
set -eu
if command -v apt-get >/dev/null 2>&1; then
  apt-get update
elif command -v apk >/dev/null 2>&1; then
  apk add --no-cache curl
else
  printf '%s\n' "unsupported"
  exit 1
fi
