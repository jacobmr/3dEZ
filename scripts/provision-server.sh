#!/usr/bin/env bash
set -euo pipefail

# 3dEZ Server Provisioning Script
# Run as root: ssh root@37.27.198.218 'bash -s' < scripts/provision-server.sh

echo "=== 3dEZ Server Provisioning ==="

# 1. System update
echo ">>> Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

# 2. Firewall (ufw)
echo ">>> Configuring firewall..."
if ! command -v ufw &>/dev/null; then
    apt-get install -y -qq ufw
fi
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "Firewall configured: SSH(22), HTTP(80), HTTPS(443)"

# 3. Docker install
if command -v docker &>/dev/null; then
    echo ">>> Docker already installed: $(docker --version)"
else
    echo ">>> Installing Docker..."
    apt-get install -y -qq ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        chmod a+r /etc/apt/keyrings/docker.gpg
    fi
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo "Docker installed: $(docker --version)"
fi

# 4. App directory
echo ">>> Creating app directory..."
mkdir -p /opt/3dez
chown root:root /opt/3dez

# 5. Fail2ban
if command -v fail2ban-client &>/dev/null; then
    echo ">>> Fail2ban already installed"
else
    echo ">>> Installing fail2ban..."
    apt-get install -y -qq fail2ban
    systemctl enable fail2ban
    systemctl start fail2ban
    echo "Fail2ban installed and enabled"
fi

# 6. Swap (2GB)
if swapon --show | grep -q '/swapfile'; then
    echo ">>> Swap already configured"
else
    echo ">>> Creating 2GB swap..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "2GB swap configured"
fi

echo ""
echo "=== Provisioning Complete ==="
echo "Docker: $(docker --version)"
echo "Compose: $(docker compose version)"
echo "Firewall: $(ufw status | head -1)"
echo "Swap: $(swapon --show --noheadings | awk '{print $3}')"
echo "App dir: /opt/3dez"
