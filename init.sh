#!/bin/bash

# Get the absolute path to the BPL3 installation directory
BPL_HOME_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Installing BPL3..."
bun i
bun run build

# Make the wrapper script executable
chmod +x ./bpl-wrapper.sh

# Create a symlink named 'bpl' pointing to the wrapper
ln -sf ./bpl-wrapper.sh ./bpl

# Install system-wide symlink
sudo ln -srf ./bpl-wrapper.sh /usr/bin/bpl

# Add BPL_HOME to .bashrc if not already present
if ! grep -q "export BPL_HOME=" ~/.bashrc; then
    echo "" >> ~/.bashrc
    echo "# BPL3 Compiler Home Directory" >> ~/.bashrc
    echo "export BPL_HOME=\"$BPL_HOME_PATH\"" >> ~/.bashrc
    echo "BPL_HOME added to ~/.bashrc"
else
    # Update existing BPL_HOME if path changed
    sed -i "s|export BPL_HOME=.*|export BPL_HOME=\"$BPL_HOME_PATH\"|" ~/.bashrc
    echo "BPL_HOME updated in ~/.bashrc"
fi

# Export for current session
export BPL_HOME="$BPL_HOME_PATH"

echo "Installation complete. You can now use the 'bpl' command."
echo "BPL_HOME is set to: $BPL_HOME"
echo "Please run 'source ~/.bashrc' or restart your terminal to use BPL_HOME in new sessions."
