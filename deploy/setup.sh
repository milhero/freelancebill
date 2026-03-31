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
# Generate a random password for the database user
DB_PASSWORD=$(openssl rand -base64 24)
sudo -u postgres psql -c "CREATE USER freelancebill WITH PASSWORD '${DB_PASSWORD}';"
sudo -u postgres psql -c "CREATE DATABASE freelancebill OWNER freelancebill;"
echo ""
echo "Database password (save this!): ${DB_PASSWORD}"
echo "DATABASE_URL=postgresql://freelancebill:${DB_PASSWORD}@localhost:5432/freelancebill"

# Install Nginx
apt install -y nginx

# Install Certbot
apt install -y certbot python3-certbot-nginx

# Create app user for running the application (don't run as root)
useradd -m -s /bin/bash freelancebill || true

# Create directories with proper permissions
mkdir -p /var/www/freelancebill
mkdir -p /var/log/freelancebill
chown -R freelancebill:freelancebill /var/www/freelancebill
chown -R freelancebill:freelancebill /var/log/freelancebill
chmod 750 /var/www/freelancebill
chmod 750 /var/log/freelancebill

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "1. Clone repo to /var/www/freelancebill"
echo "2. cp deploy/nginx.conf /etc/nginx/sites-available/freelancebill"
echo "3. ln -s /etc/nginx/sites-available/freelancebill /etc/nginx/sites-enabled/"
echo "4. Update server_name in nginx config to your domain"
echo "5. certbot --nginx -d yourdomain.example.com"
echo "6. Create .env in /var/www/freelancebill/packages/server/ (chmod 600)"
echo "7. su - freelancebill -c 'cd /var/www/freelancebill && pnpm install && pnpm build'"
echo "8. su - freelancebill -c 'pm2 start deploy/ecosystem.config.cjs'"
echo "9. pm2 save && pm2 startup"
