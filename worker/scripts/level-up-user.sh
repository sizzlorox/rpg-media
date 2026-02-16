#!/bin/bash
# Helper script to level up a user for testing level-gated features
# Usage: ./scripts/level-up-user.sh <username> <level>

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: ./scripts/level-up-user.sh <username> <level>"
  echo "Example: ./scripts/level-up-user.sh testuser 8"
  exit 1
fi

USERNAME=$1
LEVEL=$2

# Calculate approximate XP needed for the level
# Level thresholds: 1=0, 2=50, 3=100, 4=200, 5=350, 6=550, 7=800, 8=1100
XP=$((LEVEL * LEVEL * 15))

echo "Leveling up user '$USERNAME' to level $LEVEL (with $XP XP)..."

wrangler d1 execute rpg-social-media-production --local --command \
  "UPDATE users SET level = $LEVEL, total_xp = $XP WHERE username = '$USERNAME'"

echo ""
echo "Verifying..."
wrangler d1 execute rpg-social-media-production --local --command \
  "SELECT username, level, total_xp FROM users WHERE username = '$USERNAME'"

echo ""
echo "✓ Done! User can now:"
if [ $LEVEL -ge 3 ]; then
  echo "  - Upload images to posts (/post <text> --attach)"
fi
if [ $LEVEL -ge 7 ]; then
  echo "  - Upload avatar (/avatar)"
  echo "  - Upload banner (/banner)"
fi
