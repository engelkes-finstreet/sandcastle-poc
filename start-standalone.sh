#!/bin/bash

# Copy static assets to standalone build if they don't exist
if [ ! -d ".next/standalone/public" ]; then
  echo "Copying public folder to standalone build..."
  cp -r public .next/standalone/public
fi

if [ ! -d ".next/standalone/.next/static" ]; then
  echo "Copying static assets to standalone build..."
  cp -r .next/static .next/standalone/.next/static
fi

# Load environment variables from .env.local
export $(cat .env.local | grep -v '^#' | xargs)

# Start the standalone server
node .next/standalone/server.js
