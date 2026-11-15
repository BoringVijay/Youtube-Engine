#!/bin/sh
# usage: ./still.sh <outPrefix> <f,f,...> [scale=0.5]
# Renders Camp Century stills. Renders queue on a lock (this box has 2 CPUs), so several helpers can call it at once.
cd "$(dirname "$0")" && exec flock /tmp/ice-render.lock env COMP=IceShort GL=swangle CHROME=/usr/bin/google-chrome node stills.mjs "$@" 2>&1 | grep -E "^still|rror" 
