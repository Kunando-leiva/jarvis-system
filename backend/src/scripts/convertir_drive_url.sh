#!/bin/bash

# =============================================
# SCRIPT PARA CONVERTIR URL DE GOOGLE DRIVE
# =============================================

echo -e "\033[0;34m=========================================\033[0m"
echo -e "\033[0;34m   🔗 CONVERTIR URL DE GOOGLE DRIVE   \033[0m"
echo -e "\033[0;34m=========================================\033[0m"
echo ""

read -p "📎 Pega la URL de Google Drive: " URL_DRIVE

# Extraer el ID del archivo
ID=$(echo "$URL_DRIVE" | grep -oP 'file/d/\K[^/?#]+')

if [ -z "$ID" ]; then
  echo -e "\033[0;31m❌ No se pudo extraer el ID del archivo. Verifica la URL.\033[0m"
  exit 1
fi

# URL de descarga directa
URL_DESCARGAR="https://drive.google.com/uc?export=download&id=$ID"

echo ""
echo -e "\033[0;32m✅ ID extraído: $ID\033[0m"
echo -e "\033[0;32m🔗 URL de descarga directa:\033[0m"
echo -e "\033[0;34m$URL_DESCARGAR\033[0m"
echo ""

# Preguntar si quiere copiar al portapapeles (Windows)
read -p "📋 ¿Copiar al portapapeles? (s/n): " COPIAR
if [[ "$COPIAR" == "s" || "$COPIAR" == "S" ]]; then
  echo "$URL_DESCARGAR" | clip
  echo -e "\033[0;32m✅ Copiado al portapapeles\033[0m"
fi