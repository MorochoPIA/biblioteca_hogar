#!/bin/bash
# Despliegue completo - Biblioteca Digital
set -e

PROJECT_DIR=$(pwd)
USER=$(whoami)

echo "========================================"
echo "  Despliegue Biblioteca Digital"
echo "========================================"
echo ""

# 1. Instalar dependencias Python
echo "[1/6] Instalando dependencias Python..."
pip3 install --break-system-packages -r requirements.txt 2>/dev/null || pip3 install -r requirements.txt

# 2. Iniciar servidor de prueba
echo "[2/6] Probando servidor..."
python3 -c "from main import app; print('API OK')"

# 3. Instalar servicio systemd (autoinicio)
echo "[3/6] Instalando servicio systemd..."
sed "s|/home/buuu/Documentos/Default Project/biblioteca_digital|$PROJECT_DIR|g" biblioteca.service > /tmp/biblioteca.service
sed -i "s|User=buuu|User=$USER|g" /tmp/biblioteca.service
sudo cp /tmp/biblioteca.service /etc/systemd/system/biblioteca.service
sudo systemctl daemon-reload
sudo systemctl enable biblioteca
sudo systemctl start biblioteca
echo "  Servicio iniciado en http://localhost:8000"

# 4. Instalar Tesseract (opcional para OCR)
echo "[4/6] Instalando Tesseract OCR..."
sudo apt-get install -y tesseract-ocr tesseract-ocr-spa 2>/dev/null || echo "  Omitido (sin sudo)"
mkdir -p storage/pdfs_raw

# 5. Probar acceso local
echo "[5/6] Probando API..."
sleep 2
curl -s http://localhost:8000/ | python3 -m json.tool

# 6. Instrucciones Cloudflare
echo "[6/6] Para acceso desde internet:"
echo ""
echo "  PASO A - Instalar cloudflared:"
echo "    curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /tmp/cloudflared"
echo "    chmod +x /tmp/cloudflared && sudo mv /tmp/cloudflared /usr/local/bin/cloudflared"
echo ""
echo "  PASO B - Autenticar y crear tunel:"
echo "    cloudflared tunnel login"
echo "    cloudflared tunnel create biblioteca"
echo ""
echo "  PASO C - Crear CNAME en Cloudflare:"
echo "    biblioteca.tudominio.com -> TUNNEL_ID.cfargotunnel.com"
echo ""
echo "  PASO D - Ejecutar tunel:"
echo "    cloudflared tunnel run biblioteca"
echo ""
echo "========================================"
echo "  URL local: http://localhost:8000/static/index.html"
echo "========================================"
