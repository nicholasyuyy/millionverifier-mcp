#!/bin/bash
# MillionVerifier MCP — one-time setup script
# Run this once from Terminal after cloning the repo to ~/Documents/

set -e

INSTALL_DIR="$HOME/Documents/millionverifier-mcp"
CONFIG_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"

echo ""
echo "=== MillionVerifier MCP Setup ==="
echo ""

# 1. Prompt for API key
echo "You can find your API key at: https://app.millionverifier.com/api"
echo -n "Enter your MillionVerifier API key: "
read -r API_KEY

if [ -z "$API_KEY" ]; then
  echo "❌ No API key entered. Aborting."
  exit 1
fi

echo ""

# 2. Install Node dependencies
echo "📦 Installing dependencies..."
cd "$INSTALL_DIR"
npm install
echo "✅ Dependencies installed."
echo ""

# 3. Patch claude_desktop_config.json
echo "⚙️  Updating Claude config..."

python3 - "$INSTALL_DIR" "$CONFIG_FILE" "$API_KEY" <<'PYEOF'
import json, sys

install_dir = sys.argv[1]
config_path = sys.argv[2]
api_key     = sys.argv[3]

with open(config_path, "r") as f:
    config = json.load(f)

if "mcpServers" not in config:
    config["mcpServers"] = {}

config["mcpServers"]["millionverifier"] = {
    "command": "node",
    "args": [install_dir + "/index.js"],
    "env": {
        "MILLIONVERIFIER_API_KEY": api_key
    }
}

with open(config_path, "w") as f:
    json.dump(config, f, indent=2)

print("✅ Config updated successfully.")
PYEOF

echo ""
echo "==================================="
echo "✅ Setup complete!"
echo ""
echo "Next step: Quit Claude Desktop completely (Cmd+Q) and reopen it."
echo "Then ask Claude: 'verify these emails: test@example.com'"
echo "==================================="
echo ""
