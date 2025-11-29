#!/bin/bash
set -e

echo "Building BPL VS Code Extension..."

# 1. Build Server
echo "Building Server..."
cd server
npm install
npm run compile
cd ..

# 2. Build Client
echo "Building Client..."
cd client
npm install
npm run compile

# 3. Copy Server to Client
echo "Copying Server to Client..."
mkdir -p server
cp -r ../server/out server/
cp ../server/package.json server/
# We need to install server dependencies in the copied folder for production
cd server
npm install --production
cd ..

# 4. Package
echo "Packaging..."
vsce package

echo "Done! VSIX is in vs-code-ext/client/"
