#!/bin/sh
# Installs the Liverary CLI from a GitHub Release archive. Needs only sh, tar,
# sha256sum or shasum, and curl or wget; no Node, npm, or compiler.
#
#   curl -fsSL https://raw.githubusercontent.com/andongmin94/Liverary/main/scripts/install.sh | sh
#
# Environment:
#   LIVERARY_VERSION           exact stable X.Y.Z version (default: latest stable)
#   LIVERARY_HOME              Liverary home directory (default: ~/.liverary)
#   LIVERARY_INSTALL_BIN_DIR   where the `liverary` symlink goes (default: ~/.local/bin)
#   LIVERARY_RELEASE_BASE_URL  mirror for releases/download (default: GitHub)
#   T3CODE_* aliases remain supported for existing installations.
#
# The archive is unpacked into $LIVERARY_HOME/runtime/versions/<version>, the
# same layout `liverary service install` uses, so the service reuses this download
# instead of fetching the release again.
set -eu

repo="andongmin94/Liverary"
base_url="${LIVERARY_RELEASE_BASE_URL:-${T3CODE_RELEASE_BASE_URL:-https://github.com/${repo}/releases/download}}"
configured_home="${LIVERARY_HOME:-${T3CODE_HOME:-}}"
liverary_home="${configured_home:-$HOME/.liverary}"
case "$liverary_home" in
  /*) ;;
  *)
    # Preserve cwd's trailing newlines; trim only pwd's newline and the sentinel.
    liverary_cwd="$(pwd -P && printf .)"
    liverary_home="${liverary_cwd%??}/$liverary_home"
    ;;
esac
bin_dir="${LIVERARY_INSTALL_BIN_DIR:-${T3CODE_INSTALL_BIN_DIR:-$HOME/.local/bin}}"

fail() {
  printf '\nliverary install: %s\n' "$1" >&2
  exit 1
}

# ANSI stays on stderr, so `curl ... | sh` still gets progress.
interactive=false
if [ -t 2 ] && [ "${TERM:-}" != dumb ]; then interactive=true; fi
reset= bold= muted= accent= green=
if "$interactive" && [ -z "${NO_COLOR:-}" ]; then
  reset="$(printf '\033[0m')"; bold="$(printf '\033[1m')"
  muted="$(printf '\033[2m')"; accent="$(printf '\033[94m')"; green="$(printf '\033[32m')"
fi
step() {
  if "$interactive"; then printf '\r\033[2K  %s%s%s' "$muted" "$1" "$reset" >&2
  else printf '  %s\n' "$1" >&2; fi
}
if "$interactive"; then
  printf '\n  %sLiverary%s\n  %sCLI installer%s\n\n' "$bold" "$reset" "$muted" "$reset" >&2
fi
step "Finding your release..."

# Exit 44 on a 404 so callers can tell "no such asset" from a network failure.
fetch() {
  if command -v curl >/dev/null 2>&1; then
    status="$(curl -sSL -H "Accept: ${3:-*/*}" -w '%{http_code}' "$1" -o "$2")" || return 1
    case "$status" in
      2??) return 0 ;;
      404) return 44 ;;
      *) printf 'GET %s returned HTTP %s\n' "$1" "$status" >&2; return 1 ;;
    esac
  elif command -v wget >/dev/null 2>&1; then
    wget -q --server-response --header="Accept: ${3:-*/*}" "$1" -O "$2" 2>"$2.headers" && rm -f "$2.headers" && return 0
    if grep -q ' 404 ' "$2.headers" 2>/dev/null; then rm -f "$2.headers"; return 44; fi
    cat "$2.headers" >&2; rm -f "$2.headers"; return 1
  else
    fail "curl or wget is required"
  fi
}

mb() {
  tenths=$((($1 * 10 + 524288) / 1048576))
  printf '%s.%s' "$((tenths / 10))" "$((tenths % 10))"
}
# Poll the file written by the downloader; no progress-output parsing or extra request.
download() {
  if ! "$interactive"; then fetch "$1" "$2"; return; fi
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL -D "$2.headers" "$1" -o "$2" 2>"$2.errors" &
  else
    wget -q --server-response "$1" -O "$2" 2>"$2.headers" &
  fi
  download_pid=$!
  previous=-1
  cr="$(printf '\r')"
  while kill -0 "$download_pid" 2>/dev/null; do
    bytes=0; total=0
    if [ -f "$2" ]; then bytes="$(wc -c < "$2")"; fi
    if [ -f "$2.headers" ]; then
      while read -r key value; do
        case "$key" in
          HTTP/*) total=0 ;;
          [Cc]ontent-[Ll]ength:) total="${value%"$cr"}" ;;
        esac
      done < "$2.headers"
    fi
    case "$total" in ''|*[!0-9]*) total=0 ;; esac
    if [ "$bytes" -ne "$previous" ]; then
      if [ "$total" -gt 0 ]; then
        percent=$((bytes * 100 / total)); [ "$percent" -le 100 ] || percent=100
        filled=$((percent * 32 / 100)); bar=; rest=; n=0
        while [ "$n" -lt 32 ]; do
          if [ "$n" -lt "$filled" ]; then bar="${bar}■"; else rest="${rest}·"; fi
          n=$((n + 1))
        done
        printf '\r\033[2K  %s%s%s%s%s %3d%%  %s%s / %s MB%s' "$accent" "$bar" "$reset$muted" "$rest" "$reset" "$percent" "$muted" "$(mb "$bytes")" "$(mb "$total")" "$reset" >&2
      else
        printf '\r\033[2K  %sDownloading%s  %s MB' "$muted" "$reset" "$(mb "$bytes")" >&2
      fi
      previous="$bytes"
    fi
    sleep 0.1
  done
  result=0; wait "$download_pid" || result=$?
  download_pid=
  if [ "$result" -ne 0 ]; then
    printf '\n' >&2
    if [ -f "$2.errors" ]; then cat "$2.errors" >&2; else cat "$2.headers" >&2; fi
    return "$result"
  fi
  size="$(mb "$(wc -c < "$2")")"
  printf '\r\033[2K  %s■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■%s 100%%  %s%s / %s MB%s\n' "$accent" "$reset" "$muted" "$size" "$size" "$reset" >&2
  rm -f "$2.headers" "$2.errors"
}

case "$(uname -s)" in
  Darwin) platform="darwin" ;;
  Linux) platform="linux" ;;
  *) fail "unsupported operating system $(uname -s); use the desktop app or run from source" ;;
esac
case "$(uname -m)" in
  arm64 | aarch64) arch="arm64" ;;
  x86_64 | amd64) arch="x64" ;;
  *) fail "unsupported architecture $(uname -m)" ;;
esac
if [ "${platform}-${arch}" = darwin-x64 ]; then
  fail "there is no Liverary CLI build for Intel Macs. Run a server from source: https://github.com/${repo}/blob/main/README.md#source"
fi
command -v tar >/dev/null 2>&1 || fail "tar is required"
if command -v sha256sum >/dev/null 2>&1; then
  checksum() { sha256sum < "$1" | cut -d' ' -f1; }
elif command -v shasum >/dev/null 2>&1; then
  checksum() { shasum -a 256 < "$1" | cut -d' ' -f1; }
else
  fail "sha256sum or shasum is required"
fi

version="${LIVERARY_VERSION:-${T3CODE_VERSION:-}}"
if [ -z "$version" ]; then
  tmp_index="$(mktemp)"
  fetch "https://github.com/${repo}/releases/latest" "$tmp_index" application/json
  version="$(sed -n 's/.*"tag_name": *"v\([0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\)".*/\1/p' "$tmp_index" | head -n 1)"
  rm -f "$tmp_index"
  [ -n "$version" ] || fail "could not find a stable release; set LIVERARY_VERSION"
fi
printf '%s\n' "$version" | grep -Eq '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$' ||
  fail "LIVERARY_VERSION must be a stable X.Y.Z version"

stem="liverary-${version}-${platform}-${arch}"
archive="${stem}.tar.gz"
versions_dir="${liverary_home}/runtime/versions"
target_dir="${versions_dir}/${version}"

if [ -f "${target_dir}/.install-complete" ] && [ "$(cat "${target_dir}/.install-complete")" = "$version" ]; then
  step "Version ${version} is already downloaded."
  if [ -z "$configured_home" ] && [ -x "${target_dir}/liverary" ]; then
    "${target_dir}/liverary" __migrate-home "$HOME/.t3-custom" "$liverary_home"
  fi
else
  staging="$(mktemp -d "${TMPDIR:-/tmp}/liverary-install-XXXXXX")"
  download_pid=
  trap '[ -z "$download_pid" ] || { kill "$download_pid" 2>/dev/null || true; wait "$download_pid" 2>/dev/null || true; }; rm -rf "$staging"' EXIT
  trap 'printf "\n" >&2; exit 130' INT
  trap 'printf "\n" >&2; exit 143' TERM

  if "$interactive"; then printf '\r\033[2K' >&2; fi
  printf '  %sInstalling%s Liverary %s%s%s\n\n' "$muted" "$reset" "$bold" "$version" "$reset" >&2
  step "Downloading..."
  fetch_status=0
  fetch "${base_url}/v${version}/SHA256SUMS" "${staging}/SHA256SUMS" || fetch_status=$?
  if [ "$fetch_status" -eq 44 ]; then
    fail "Liverary ${version} has no release archive for ${platform}-${arch}; choose a supported version at https://github.com/${repo}/releases"
  elif [ "$fetch_status" -ne 0 ]; then
    fail "could not download the release checksums"
  fi
  canonical_release=true
  expected="$(grep " \*\{0,1\}${archive}\$" "${staging}/SHA256SUMS" | cut -d' ' -f1)"
  if [ -z "$expected" ]; then
    canonical_release=false
    stem="t3-${version}-${platform}-${arch}"
    archive="${stem}.tar.gz"
    expected="$(grep " \*\{0,1\}${archive}\$" "${staging}/SHA256SUMS" | cut -d' ' -f1)"
  fi
  [ -n "$expected" ] || fail "Liverary ${version} has no release archive for ${platform}-${arch}"
  download "${base_url}/v${version}/${archive}" "${staging}/${archive}"

  step "Verifying the download..."
  actual="$(checksum "${staging}/${archive}")"
  [ "$actual" = "$expected" ] || fail "checksum mismatch for ${archive}"

  step "Extracting Liverary..."
  tar -xzf "${staging}/${archive}" -C "$staging" --strip-components=1
  rm -f "${staging}/${archive}" "${staging}/SHA256SUMS"
  if "$canonical_release"; then
    "${staging}/liverary" --version >/dev/null || fail "the downloaded executable does not run"
    if [ -z "$configured_home" ]; then
      "${staging}/liverary" __migrate-home "$HOME/.t3-custom" "$liverary_home"
    fi
  else
    "${staging}/t3" --version >/dev/null || fail "the downloaded executable does not run"
    if [ -z "$configured_home" ]; then liverary_home="$HOME/.t3-custom"; fi
  fi
  versions_dir="${liverary_home}/runtime/versions"
  target_dir="${versions_dir}/${version}"
  mkdir -p "$versions_dir"
  rm -rf "$target_dir"
  mv "$staging" "$target_dir"
  printf '%s\n' "$version" > "${target_dir}/.install-complete"
  trap - EXIT
fi

entry="${target_dir}/liverary"
if [ ! -x "$entry" ]; then entry="${target_dir}/t3"; fi
step "Setting up the liverary command..."
mkdir -p "$bin_dir"
ln -sfn "$entry" "${bin_dir}/liverary"
legacy_launcher="${bin_dir}/t3"
legacy_entry="${target_dir}/t3"
legacy_linked=false
if [ ! -e "$legacy_launcher" ] && [ ! -L "$legacy_launcher" ]; then
  ln -s "$legacy_entry" "$legacy_launcher"
  legacy_linked=true
elif [ -L "$legacy_launcher" ]; then
  case "$(readlink "$legacy_launcher")" in
    "${liverary_home}/runtime/versions/"* | "$HOME/.t3-custom/runtime/versions/"*) ln -sfn "$legacy_entry" "$legacy_launcher"; legacy_linked=true ;;
  esac
fi
# Pruning keeps runtimes referenced by either the current or legacy launcher.
launcher_root="$(CDPATH='' cd -P -- "$bin_dir" && pwd)"
launchers="${liverary_home}/runtime/launchers"
for launcher in "${launcher_root}/liverary" "${launcher_root}/t3"; do
  [ "$launcher" != "${launcher_root}/t3" ] || "$legacy_linked" || continue
  grep -qxF "$launcher" "$launchers" 2>/dev/null || printf '%s\n' "$launcher" >> "$launchers"
done
if "$interactive"; then printf '\r\033[2K' >&2; fi
printf '  %sInstalled Liverary %s%s\n\n' "$green" "$version" "$reset" >&2
case ":${PATH}:" in
  *":${bin_dir}:"*) printf '  Run %sliverary%s to use Liverary here, or %sliverary up%s to use it from your other devices.\n\n' "$bold" "$reset" "$bold" "$reset" ;;
  *) printf '  Add %s to your PATH, then run %sliverary%s.\n\n' "$bin_dir" "$bold" "$reset" ;;
esac
