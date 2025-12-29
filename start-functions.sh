#!/bin/bash

# Script to start Supabase Edge Functions
# This should be run in a separate terminal and kept running

cd "$(dirname "$0")"

echo "Starting Supabase Edge Functions server..."
echo "This will serve all functions on http://127.0.0.1:54321/functions/v1"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

supabase functions serve --no-verify-jwt

