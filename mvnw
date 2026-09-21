#!/bin/sh
set -e
set -u

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
WRAPPER_JAR="$PROJECT_DIR/.mvn/wrapper/maven-wrapper.jar"

if [ ! -f "$WRAPPER_JAR" ]; then
  echo "Downloading Maven Wrapper..."
  mkdir -p "$PROJECT_DIR/.mvn/wrapper"
  if command -v curl >/dev/null 2>&1; then
    curl -fLo "$WRAPPER_JAR" https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar
  elif command -v wget >/dev/null 2>&1; then
    wget -O "$WRAPPER_JAR" https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar
  else
    echo "Error: Neither curl nor wget is available to download Maven Wrapper." >&2
    exit 1
  fi
fi

exec java -jar "$WRAPPER_JAR" "$@"
