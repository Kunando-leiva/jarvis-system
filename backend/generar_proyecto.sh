#!/bin/bash
echo "📁 Generando proyecto_completo.txt..."
echo "📂 Excluyendo: node_modules, .git, temp, logs, dist, build, cache"
echo ""

find . -type f \( -name "*.js" -o -name "*.json" -o -name "*.html" -o -name "*.css" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/.git/*" \
  ! -path "*/temp/*" \
  ! -path "*/logs/*" \
  ! -path "*/dist/*" \
  ! -path "*/build/*" \
  ! -path "*/cache/*" \
  ! -path "*/coverage/*" \
  ! -path "*/.nyc_output/*" \
  | while read file; do
    echo "========== $file =========="
    cat "$file"
    echo ""
  done > proyecto_completo.txt

echo ""
echo "✅ Archivo generado: proyecto_completo.txt"
echo "📊 Tamaño: $(ls -lh proyecto_completo.txt | awk '{print $5}')"
echo "📁 Ubicación: $(pwd)/proyecto_completo.txt"
