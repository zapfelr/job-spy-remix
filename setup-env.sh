#!/bin/bash

# Setup script for Job Spy Remix development environment

echo "Setting up development environment for Job Spy Remix..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "Creating .env.local from example..."
  cp .env.local.example .env.local
  echo "Please update .env.local with your Supabase credentials"
else
  echo ".env.local already exists"
fi

# Check if wrangler.toml exists
if [ ! -f wrangler.toml ]; then
  echo "Creating wrangler.toml from example..."
  cp wrangler.example.toml wrangler.toml
  echo "Please update wrangler.toml with your Supabase credentials"
else
  echo "wrangler.toml already exists"
fi

# Check if wrangler.job-changes-cleanup.toml exists
if [ ! -f wrangler.job-changes-cleanup.toml ]; then
  echo "Creating wrangler.job-changes-cleanup.toml from example..."
  cp wrangler.job-changes-cleanup.example.toml wrangler.job-changes-cleanup.toml
  echo "Please update wrangler.job-changes-cleanup.toml with your Supabase credentials"
else
  echo "wrangler.job-changes-cleanup.toml already exists"
fi

echo ""
echo "IMPORTANT: Make sure to update the following files with your Supabase credentials:"
echo "- .env.local"
echo "- wrangler.toml"
echo "- wrangler.job-changes-cleanup.toml"
echo ""
echo "DO NOT commit these files to Git as they contain sensitive information!"
echo "They are already in .gitignore, but be careful not to force-add them."
echo ""
echo "Setup complete!" 