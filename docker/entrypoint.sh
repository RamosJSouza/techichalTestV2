#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
node ./scripts/wait-for-db.mjs

echo "Applying migrations..."
node ./scripts/migrate.mjs

echo "Starting API..."
exec node dist/main.js
