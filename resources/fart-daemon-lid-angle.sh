#!/bin/bash
# Desktop Buddy -- LidAngleSensor-based fart daemon
# Polls lid angle via `lidanglesensor` and plays fart.mp3 when lid closes.
# Primary detection method; falls back to notifyutil-based daemon on Macs
# where lidanglesensor is unavailable.

FART_WAV="${1:-$HOME/.desktop-buddy/fart.mp3}"
MUTE_FILE="$HOME/.desktop-buddy-fart-mute"
LOG_FILE="$HOME/Library/Logs/desktop-buddy-fart.log"
THRESHOLD=20
POLL_INTERVAL=0.5

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [lid-angle] $1" >> "$LOG_FILE"
}

# Verify lidanglesensor is available
if ! command -v lidanglesensor &>/dev/null; then
    log "ERROR: lidanglesensor not found in PATH. Install via: brew install lidanglesensor"
    echo "ERROR: lidanglesensor not found in PATH. Install via: brew install lidanglesensor" >&2
    exit 1
fi

# Verify fart.mp3 exists
if [ ! -f "$FART_WAV" ]; then
    log "ERROR: fart.mp3 not found at $FART_WAV"
    echo "ERROR: fart.mp3 not found at $FART_WAV" >&2
    exit 1
fi

log "Started. Watching lid angle (threshold=${THRESHOLD} degrees). Sound: $FART_WAV"

# Track whether we already played for the current lid-close event
played=false

while true; do
    # Read current lid angle
    angle_output=$(lidanglesensor 2>/dev/null)
    angle=$(echo "$angle_output" | grep -oE '[0-9]+(\.[0-9]+)?' | head -1)

    if [ -z "$angle" ]; then
        log "WARNING: Could not read lid angle from output: $angle_output"
        sleep "$POLL_INTERVAL"
        continue
    fi

    # Compare angle to threshold (integer comparison; strip decimals)
    angle_int=${angle%%.*}

    if [ "$angle_int" -lt "$THRESHOLD" ]; then
        if [ "$played" = false ]; then
            # Check mute file
            if [ -f "$MUTE_FILE" ]; then
                log "Lid closing (angle=${angle}) but muted -- skipping"
            else
                log "Lid closing (angle=${angle}) -- playing fart sound"
                afplay "$FART_WAV" &
            fi
            played=true
        fi
    else
        # Lid is open again; reset debounce
        if [ "$played" = true ]; then
            log "Lid reopened (angle=${angle}) -- resetting debounce"
            played=false
        fi
    fi

    sleep "$POLL_INTERVAL"
done
