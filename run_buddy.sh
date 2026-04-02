#!/bin/bash
# Opens a new Terminal window, runs claude with /buddy, waits, then screenshots

SCREENSHOT_PATH="$HOME/buddy/buddy_screenshot.png"
WAIT_SECONDS="${1:-12}"

echo "Launching Claude in a new Terminal window..."

# Open a new Terminal window and run claude in print mode with /buddy
osascript <<'APPLESCRIPT'
tell application "Terminal"
    activate
    do script "claude -p '/buddy'"
end tell
APPLESCRIPT

echo "Waiting ${WAIT_SECONDS}s for Claude to respond..."
sleep "$WAIT_SECONDS"

# Bring Terminal to front and screenshot it
osascript -e 'tell application "Terminal" to activate'
sleep 1

# Use Python to find Terminal's CGWindowID and screenshot just that window
WINDOW_ID=$(python3 -c "
import Quartz
windows = Quartz.CGWindowListCopyWindowInfo(
    Quartz.kCGWindowListOptionOnScreenOnly,
    Quartz.kCGNullWindowID
)
for w in windows:
    if w.get('kCGWindowOwnerName') == 'Terminal' and w.get('kCGWindowLayer') == 0:
        print(w['kCGWindowNumber'])
        break
" 2>/dev/null)

if [ -n "$WINDOW_ID" ]; then
    screencapture -x -l "$WINDOW_ID" "$SCREENSHOT_PATH"
    echo "Screenshot saved to: $SCREENSHOT_PATH"
else
    # Fallback: screenshot the whole screen
    screencapture -x "$SCREENSHOT_PATH"
    echo "Screenshot saved (full screen) to: $SCREENSHOT_PATH"
fi

echo "Done!"
