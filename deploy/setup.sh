#!/bin/bash
# FreelanceBill VPS Setup Script
# Run on a fresh Ubuntu/Debian server

set -e

echo "=== FreelanceBill VPS Setup ==="

# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PM2
npm install -g pm2

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Configure PostgreSQL
sudo -u postgres psql -c "CREATE USER freelancebill WITH PASSWORD 'CHANGE_THIS_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE freelancebill OWNER freelancebill;"

# Install Nginx
apt install -y nginx

# Install Certbot
apt install -y certbot python3-certbot-nginx

# Create directories
mkdir -p /var/www/freelancebill
mkdir -p /var/log/freelancebill

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "1. Clone repo to /var/www/freelancebill"
echo "2. cp deploy/nginx.conf /etc/nginx/sites-available/freelancebill"
echo "3. ln -s /etc/nginx/sites-available/freelancebill /etc/nginx/sites-enabled/"
echo "4. certbot --nginx -d finance.milanronnenberg.de"
echo "5. Create .env in /var/www/freelancebill/packages/server/"
echo "6. pnpm install && pnpm build"
echo "7. pm2 start deploy/ecosystem.config.cjs"
echo "8. pm2 save && pm2 startup"
