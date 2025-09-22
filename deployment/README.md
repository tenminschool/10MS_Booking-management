# Production Deployment Guide

This guide covers the complete production deployment setup for the Speaking Test Booking System.

## Prerequisites

- Ubuntu 20.04+ or similar Linux distribution
- Root or sudo access
- Domain name with DNS configured
- At least 2GB RAM and 20GB storage

## Quick Setup

1. **Run the setup script:**
   ```bash
   chmod +x deployment/setup-production.sh
   sudo ./deployment/setup-production.sh
   ```

2. **Configure environment variables:**
   ```bash
   cp deployment/.env.production.template /var/www/speaking-test-booking/.env.production
   nano /var/www/speaking-test-booking/.env.production
   ```

3. **Update Nginx configuration:**
   ```bash
   sudo nano /etc/nginx/sites-available/speaking-test-booking
   # Update your-domain.com with your actual domain
   ```

4. **Set up SSL certificate:**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

5. **Deploy the application:**
   ```bash
   ./deployment/deploy.sh
   ```

## Detailed Setup Instructions

### 1. System Setup

The `setup-production.sh` script will:
- Install Node.js, PostgreSQL, Nginx, PM2, and Certbot
- Create application user and directories
- Configure PostgreSQL database
- Set up firewall rules
- Configure log rotation
- Create backup scripts and cron jobs

### 2. Application Configuration

#### Environment Variables

Copy and configure the production environment file:

```bash
cp deployment/.env.production.template /var/www/speaking-test-booking/.env.production
```

Key variables to update:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secure random string (32+ characters)
- `SMS_API_KEY` & `SMS_API_SECRET`: SMS provider credentials
- `FRONTEND_URL`: Your domain URL
- `ADMIN_EMAIL`: Administrator email address

#### Nginx Configuration

Update the domain name in `/etc/nginx/sites-available/speaking-test-booking`:

```nginx
server_name your-domain.com www.your-domain.com;
```

#### SSL Certificate

Set up SSL certificate with Let's Encrypt:

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 3. Database Setup

The setup script creates a PostgreSQL database. To manually set up:

```bash
sudo -u postgres createuser --interactive --pwprompt speakingtest
sudo -u postgres createdb speakingtest_prod -O speakingtest
```

Update the `DATABASE_URL` in your `.env.production` file with the correct password.

### 4. Application Deployment

#### Initial Deployment

1. Clone your repository to `/var/www/speaking-test-booking`
2. Run the deployment script:
   ```bash
   cd /var/www/speaking-test-booking
   ./deployment/deploy.sh
   ```

#### Subsequent Deployments

```bash
./deployment/deploy.sh
```

The deployment script will:
- Create a backup of the current deployment
- Pull latest code from Git
- Install dependencies
- Build the application
- Run database migrations
- Update PM2 processes
- Test the deployment
- Reload Nginx

### 5. Monitoring Setup

#### Health Checks

The application provides several health check endpoints:
- `/health` - Basic health check
- `/health/detailed` - Detailed system metrics
- `/health/ready` - Readiness probe
- `/health/live` - Liveness probe

#### Production Monitor

Install and start the monitoring service:

```bash
sudo cp deployment/speaking-test-monitor.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable speaking-test-monitor
sudo systemctl start speaking-test-monitor
```

Check monitor status:
```bash
sudo systemctl status speaking-test-monitor
```

#### Log Monitoring

Logs are stored in `/var/log/speaking-test-booking/`:
- `combined.log` - Application logs
- `error.log` - Error logs
- `monitor.log` - Monitoring logs
- `backup.log` - Backup operation logs
- `deploy.log` - Deployment logs

View logs in real-time:
```bash
tail -f /var/log/speaking-test-booking/combined.log
```

### 6. Backup and Maintenance

#### Automated Backups

Daily backups are configured via cron job:
```bash
crontab -l  # View current cron jobs
```

Manual backup:
```bash
/usr/local/bin/backup-speaking-test.sh
```

#### Database Maintenance

Run maintenance tasks:
```bash
./deployment/database-maintenance.sh full
```

Available maintenance commands:
- `backup` - Create database backup
- `cleanup` - Clean old backups and audit logs
- `optimize` - Optimize database performance
- `health` - Check database health
- `report` - Generate maintenance report
- `full` - Run all maintenance tasks

### 7. Security Configuration

#### Firewall

The setup script configures UFW firewall:
```bash
sudo ufw status  # Check firewall status
```

#### SSL/TLS

SSL is configured with strong ciphers and security headers:
- TLS 1.2 and 1.3 only
- HSTS enabled
- Security headers configured

#### Rate Limiting

Nginx is configured with rate limiting:
- API endpoints: 10 requests/second
- Auth endpoints: 5 requests/second

## Operations

### Starting/Stopping Services

#### Application (PM2)
```bash
pm2 start ecosystem.config.js --env production
pm2 stop speaking-test-api
pm2 restart speaking-test-api
pm2 logs speaking-test-api
```

#### Nginx
```bash
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx
sudo systemctl reload nginx
```

#### PostgreSQL
```bash
sudo systemctl start postgresql
sudo systemctl stop postgresql
sudo systemctl restart postgresql
```

#### Monitor Service
```bash
sudo systemctl start speaking-test-monitor
sudo systemctl stop speaking-test-monitor
sudo systemctl restart speaking-test-monitor
```

### Troubleshooting

#### Check Application Status
```bash
pm2 status
pm2 logs speaking-test-api --lines 100
```

#### Check Health
```bash
curl http://localhost:3001/health
curl http://localhost:3001/health/detailed
```

#### Check Database Connection
```bash
psql -U speakingtest -h localhost -d speakingtest_prod -c "SELECT 1;"
```

#### Check Nginx Configuration
```bash
sudo nginx -t
sudo systemctl status nginx
```

#### View System Resources
```bash
htop
df -h
free -h
```

### Rollback

If deployment fails, rollback to previous version:
```bash
./deployment/deploy.sh rollback
```

### Scaling

#### Increase PM2 Instances
Edit `deployment/ecosystem.config.js`:
```javascript
instances: 4,  // Increase from 2 to 4
```

Then reload:
```bash
pm2 reload ecosystem.config.js --env production
```

#### Database Optimization
```bash
./deployment/database-maintenance.sh optimize
```

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Application Health**
   - Response time < 5 seconds
   - Memory usage < 80%
   - CPU usage < 80%
   - Error rate < 5%

2. **Database Health**
   - Connection count
   - Query performance
   - Disk usage
   - Backup status

3. **System Health**
   - Disk space > 20% free
   - Memory usage < 90%
   - Load average
   - Network connectivity

### Log Analysis

Important log patterns to monitor:
```bash
# Error patterns
grep -i "error" /var/log/speaking-test-booking/combined.log

# Failed authentication attempts
grep "authentication failed" /var/log/speaking-test-booking/combined.log

# Database connection issues
grep "database" /var/log/speaking-test-booking/error.log

# High response times
grep "slow" /var/log/speaking-test-booking/monitor.log
```

## Maintenance Schedule

### Daily
- Automated database backup (2:00 AM)
- Log rotation
- Health monitoring

### Weekly
- Review monitoring alerts
- Check disk space usage
- Review error logs

### Monthly
- Database optimization
- Security updates
- Backup verification
- Performance review

## Support

For issues and support:
1. Check application logs: `/var/log/speaking-test-booking/`
2. Verify health endpoints: `/health/detailed`
3. Check system resources: `htop`, `df -h`
4. Review monitoring logs
5. Contact system administrator

## Security Checklist

- [ ] SSL certificate installed and auto-renewal configured
- [ ] Firewall configured and enabled
- [ ] Database password is strong and secure
- [ ] JWT secret is secure (32+ characters)
- [ ] SMS API credentials are secure
- [ ] Regular security updates applied
- [ ] Backup encryption configured (if required)
- [ ] Access logs monitored for suspicious activity
- [ ] Rate limiting configured and tested
- [ ] Security headers configured in Nginx