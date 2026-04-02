Take a screenshot of the current terminal window and save it to ~/ascii_buddy_screenshot.png.

Use the macOS `screencapture` command. To capture just the current terminal window:
1. Use python3 with Quartz to find the Terminal (or iTerm2, or Ghostty, or whatever terminal app is running) CGWindowID
2. Run `screencapture -x -l <windowID> ~/ascii_buddy_screenshot.png`
3. If that fails, fall back to `screencapture -x ~/ascii_buddy_screenshot.png` for full screen

After saving, read the screenshot file and show it to the user.
