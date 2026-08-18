#!/bin/bash
# Configuracion de Cloudflare Tunnel para la Biblioteca Digital
# Proporciona acceso HTTPS publico sin abrir puertos en el router
#
# Requisitos:
#   1. Crear cuenta en https://dash.cloudflare.com
#   2. Tener un dominio en Cloudflare
#   3. Descargar cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

set -e

echo "=== Cloudflare Tunnel - Biblioteca Digital ==="
echo ""

# Verificar cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo "[1/5] Descargando cloudflared..."
    curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /tmp/cloudflared
    chmod +x /tmp/cloudflared
    sudo mv /tmp/cloudflared /usr/local/bin/cloudflared
fi

echo "[2/5] Autenticando con Cloudflare..."
echo "Se abrira una pagina web para iniciar sesion."
echo "Presiona Enter para continuar..."
read
cloudflared tunnel login

echo "[3/5] Creando tunnel..."
cloudflared tunnel create biblioteca-tunnel

echo "[4/5] Creando archivo de configuracion..."
TUNNEL_ID=$(cloudflared tunnel list | grep biblioteca-tunnel | awk '{print $1}')

cat > ~/.cloudflared/config.yml << EOF
tunnel: $TUNNEL_ID
credentials-file: /home/buuu/.cloudflared/$TUNNEL_ID.json

ingress:
  - hostname: biblioteca.tudominio.com
    service: http://localhost:8000
  - service: http_status:404
EOF

echo "[5/5] Configurando DNS..."
echo "Crea un registro CNAME en Cloudflare:"
echo "  Nombre: biblioteca"
echo "  Target: $TUNNEL_ID.cfargotunnel.com"
echo "Luego ejecuta: cloudflared tunnel run biblioteca-tunnel"
echo ""
echo "O instalalo como servicio:"
echo "  sudo cloudflared service install"
echo ""
echo "=== Configuracion completada ==="
