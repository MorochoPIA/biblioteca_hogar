#!/bin/bash
# Setup automatico de la Biblioteca Digital
set -e

echo "=== Instalando dependencias Python ==="
pip install -r requirements.txt

echo ""
echo "=== Iniciando servidor ==="
echo "Ejecuta el siguiente comando para iniciar:"
echo "  uvicorn main:app --host 0.0.0.0 --port 8000"
echo ""
echo "Luego abre en tu navegador:"
echo "  http://localhost:8000/static/index.html"
echo ""

# Opcion de autoinicio
read -p "Instalar como servicio de sistema (systemd)? (s/N): " INSTALL_SERVICE
if [ "$INSTALL_SERVICE" = "s" ] || [ "$INSTALL_SERVICE" = "S" ]; then
    PROJECT_DIR=$(pwd)
    sed "s|/home/buuu/Documentos/Default Project/biblioteca_digital|$PROJECT_DIR|g" biblioteca.service > /tmp/biblioteca.service
    sed -i "s|User=buuu|User=$(whoami)|g" /tmp/biblioteca.service
    sudo cp /tmp/biblioteca.service /etc/systemd/system/biblioteca.service
    sudo systemctl daemon-reload
    sudo systemctl enable biblioteca
    sudo systemctl start biblioteca
    echo "Servicio instalado e iniciado."
fi

# Opcion de OCR
read -p "Instalar Tesseract OCR? (s/N): " INSTALL_OCR
if [ "$INSTALL_OCR" = "s" ] || [ "$INSTALL_OCR" = "S" ]; then
    sudo apt install -y tesseract-ocr tesseract-ocr-spa
    mkdir -p storage/pdfs_raw storage/pdfs
    echo "Tesseract instalado."
fi

echo ""
echo "=== Setup completado ==="
