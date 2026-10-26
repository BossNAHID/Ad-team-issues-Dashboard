#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
npx --yes tailwindcss@3.4.17 -c tailwind.config.cjs -i assets/tailwind.input.css -o "$tmp" --minify
{
  printf '/*! Tailwind CSS v3.4.17 | MIT License | https://tailwindcss.com */\n'
  printf '/*! Generated from index.html and isf-form.js; see tailwind.config.cjs. */\n'
  cat "$tmp"
} > assets/tailwind.min.css
