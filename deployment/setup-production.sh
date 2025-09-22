#!/bin/bash

# Production Setup Script for Speaking Test Booking System
# Run this script on your VPS to set up the production environment

set -e

echo "🚀 Setting up Speaking Test Booking System Production Environment"

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
echo "🐘 Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
echo "🌐 Installing Nginx..."
sudo apt install -y nginx

# Install PM2 globally
echo "⚡ Installing PM2..."
sudo npm install -g pm2

# Install Certbot for SSL
echo "🔒 Installing Certbot for SSL..."
sudo apt install -y certbot python3-certbot-nginx

# Create application user
echo "👤 Creating application user..."
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG sudo deploy

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/speaking-test-booking
sudo chown deploy:deploy /var/www/speaking-test-booking

# Create log directory
echo "📝 Creating log directory..."
sudo mkdir -p /var/log/speaking-test-booking
sudo chown deploy:deploy /var/log/speaking-test-booking

# Set up PostgreSQL database
echo "🗄️ Setting up PostgreSQL database..."
sudo -u postgres createuser --interactive --pwprompt speakingtest
sudo -u postgres createdb speakingtest_prod -O speakingtest

# Configure PostgreSQL for production
echo "⚙️ Configuring PostgreSQL..."
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" /etc/postgresql/*/main/postgresql.conf
sudo sed -i "s/#max_connections = 100/max_connections = 200/" /etc/postgresql/*/main/postgresql.conf
sudo sed -i "s/#shared_buffers = 128MB/shared_buffers = 256MB/" /etc/postgresql/*/main/postgresql.conf

# Restart PostgreSQL
sudo systemctl restart postgresql
sudo systemctl enable postgresql

# Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Copy Nginx configuration
echo "🌐 Configuring Nginx..."
sudo cp deployment/nginx.conf /etc/nginx/sites-available/speaking-test-booking
sudo ln -sf /etc/nginx/sites-available/speaking-test-booking /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Set up log rotation
echo "🔄 Setting up log rotation..."
sudo tee /etc/logrotate.d/speaking-test-booking > /dev/null <<EOF
/var/log/speaking-test-booking/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 deploy deploy
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Set up PM2 startup script
echo "⚡ Setting up PM2 startup..."
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u deploy --hp /home/deploy

# Create backup script
echo "💾 Creating backup script..."
sudo tee /usr/local/bin/backup-speaking-test.sh > /dev/null <<'EOF'
#!/bin/bash

# Backup script for Speaking Test Booking System
BACKUP_DIR="/var/backups/speaking-test-booking"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="speakingtest_prod"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U speakingtest -h localhost $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Application files backup (excluding node_modules)
tar --exclude='node_modules' --exclude='dist' --exclude='*.log' -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /var/www/speaking-test-booking

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

sudo chmod +x /usr/local/bin/backup-speaking-test.sh

# Set up daily backup cron job
echo "⏰ Setting up backup cron job..."
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-speaking-test.sh >> /var/log/speaking-test-booking/backup.log 2>&1") | crontab -

# Create environment file template
echo "📝 Creating environment file template..."
sudo tee /var/www/speaking-test-booking/.env.production > /dev/null <<EOF
# Production Environment Variables
NODE_ENV=production
PORT=3001

# Database Configuration
DATABASE_URL="postgresql://speakingtest:YOUR_DB_PASSWORD@localhost:5432/speakingtest_prod"

# JWT Configuration
JWT_SECRET="your-super-secure-jwt-secret-here"
JWT_EXPIRES_IN="24h"

# SMS Configuration
SMS_API_KEY="your-sms-api-key"
SMS_API_SECRET="your-sms-api-secret"
SMS_SENDER_ID="10MS"

# Application Configuration
FRONTEND_URL="https://your-domain.com"
ADMIN_EMAIL="admin@your-domain.com"

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring Configuration
ENABLE_AUDIT_LOGS=true
LOG_LEVEL="info"
HEALTH_CHECK_INTERVAL=30000
EOF

sudo chown deploy:deploy /var/www/speaking-test-booking/.env.production

echo "✅ Production environment setup completed!"
echo ""
echo "Next steps:"
echo "1. Update the domain name in /etc/nginx/sites-available/speaking-test-booking"
echo "2. Configure SSL certificate: sudo certbot --nginx -d your-domain.com"
echo "3. Update environment variables in /var/www/speaking-test-booking/.env.production"
echo "4. Deploy your application code to /var/www/speaking-test-booking"
echo "5. Run: cd /var/www/speaking-test-booking && npm install && npm run build"
echo "6. Start the application: pm2 start ecosystem.config.js --env production"
echo "7. Save PM2 configuration: pm2 save"
echo ""
echo "🎉 Your production environment is ready!"