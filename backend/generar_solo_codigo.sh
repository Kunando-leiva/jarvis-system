#!/bin/bash
# Genera solo archivos de código (JS, CSS, HTML)
find . -type f \( -name "*.js" -o -name "*.json" -o -name "*.html" -o -name "*.css" -o -name "*.py" -o -name "*.txt" -o -name "*.env" \) ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/temp/*" ! -path "*/logs/*" ! -path "*/__pycache__/*" -maxdepth 10 2>/dev/null | while read file; do echo "=== $file ==="; cat "$file"; echo ""; done > proyecto.txt
