#!/bin/bash
# Desktop Buddy -- notifyutil-based fart daemon (fallback)
# Waits for lid-close Darwin notification and plays fart.mp3.
# Used on Macs where lidanglesensor is not available (e.g., Apple Silicon).

FART_WAV="${1:-$HOME/.desktop-buddy/fart.mp3}"
MUTE_FILE="$HOME/.desktop-buddy-fart-mute"
LOG_FILE="$HOME/Library/Logs/desktop-buddy-fart.log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [notifyutil] $1" >> "$LOG_FILE"
}

# Verify fart.mp3 exists
if [ ! -f "$FART_WAV" ]; then
    log "ERROR: fart.mp3 not found at $FART_WAV"
    echo "ERROR: fart.mp3 not found at $FART_WAV" >&2
    exit 1
fi

log "Started. Waiting for lid-close notifications. Sound: $FART_WAV"

while true; do
    # Block until lid-close notification fires
    notifyutil -w com.apple.system.powermanagement.lidclose

    # Check mute file
    if [ -f "$MUTE_FILE" ]; then
        log "Lid closed but muted -- skipping"
        continue
    fi

    log "Lid closed -- playing fart sound"
    afplay "$FART_WAV" &
done
