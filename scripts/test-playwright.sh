#!/usr/bin/env bash
set -euo pipefail

LOCAL_LIBS="$(pwd)/.tools/playwright-libs/lib/usr/lib/x86_64-linux-gnu"

if [ -d "$LOCAL_LIBS" ]; then
  export LD_LIBRARY_PATH="$LOCAL_LIBS${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
fi

playwright test "$@"
