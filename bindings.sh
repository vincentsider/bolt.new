#!/bin/bash

bindings=""

# Read from .env file first
if [ -f .env ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    if [[ ! "$line" =~ ^# ]] && [[ -n "$line" ]]; then
      name=$(echo "$line" | cut -d '=' -f 1)
      value=$(echo "$line" | cut -d '=' -f 2-)
      value=$(echo $value | sed 's/^"\(.*\)"$/\1/')
      bindings+="--binding ${name}=${value} "
    fi
  done < .env
fi

# Then read from .env.local (overwrites .env values)
if [ -f .env.local ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    if [[ ! "$line" =~ ^# ]] && [[ -n "$line" ]]; then
      name=$(echo "$line" | cut -d '=' -f 1)
      value=$(echo "$line" | cut -d '=' -f 2-)
      value=$(echo $value | sed 's/^"\(.*\)"$/\1/')
      bindings+="--binding ${name}=${value} "
    fi
  done < .env.local
fi

bindings=$(echo $bindings | sed 's/[[:space:]]*$//')

echo $bindings
