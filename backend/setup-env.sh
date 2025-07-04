#!/bin/bash
echo "Setting up environment variables for CheckIn web app..."
if [ ! -f .env ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env
  echo "✅ .env file created!"
  echo "⚠️  Please edit .env file with your actual values:"
  echo "   - MONGODB_URI: Your MongoDB connection string"
   - EMAIL_USER: Your Gmail address"
   - EMAIL_PASSWORD: Your Gmail app password"
   - JWT_SECRET: A secure random string"
else
  echo "✅ .env file already exists!"
fi
