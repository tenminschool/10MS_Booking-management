# Production Deployment Checklist

Use this checklist to ensure a complete and secure production deployment of the Speaking Test Booking System.

## Pre-Deployment Preparation

### Server Requirements
- [ ] VPS/Server with Ubuntu 20.04+ (minimum 2GB RAM, 20GB storage)
- [ ] Root or sudo access to the server
- [ ] Domain name configured with DNS pointing to server IP
- [ ] SSH access configured

### Code Preparation
- [ ] All code committed and pushed to main branch
- [ ] All tests passing locally
- [ ] Environment variables documented
- [ ] Database migrations ready
- [ ] Build process tested locally

## Initial Server Setup

### System Setup
- [ ] Run `sudo ./deployment/setup-production.sh`
- [ ] Verify Node.js installation: `node --version`
- [ ] Verify PostgreSQL installation: `sudo systemctl status postgresql`
- [ ] Verify Nginx installation: `sudo systemctl status nginx`
- [ ] Verify PM2 installation: `pm2 --version`

### Security Hardening
- [ ] Run `sudo ./deployment/security-hardening.sh`
- [ ] Configure SSH key-based authentication
- [ ] Disable password authentication (after SSH keys are set up)
- [ ] Change default SSH port (optional but recommended)
- [ ] Verify firewall status: `sudo ufw status`

## Application Configuration

### Environment Variables
- [ ] Copy `.env.production.template` to `.env.production`
- [ ] Update `DATABASE_URL` with secure database password
- [ ] Generate secure `JWT_SECRET` (32+ characters)
- [ ] Configure SMS provider credentials
- [ ] Set correct `FRONTEND_URL` domain
- [ ] Update `ADMIN_EMAIL` address
- [ ] Verify all environment variables are set

### Database Setup
- [ ] Create PostgreSQL user and database
- [ ] Test database connection
- [ ] Update database password in environment file
- [ ] Verify database permissions

### Domain and SSL
- [ ] Update domain name in Nginx configuration
- [ ] Test Nginx configuration: `sudo nginx -t`
- [ ] Obtain SSL certificate: `sudo certbot --nginx -d your-domain.com`
- [ ] Verify SSL certificate auto-renewal: `sudo certbot renew --dry-run`

## Application Deployment

### Code Deployment
- [ ] Clone repository to `/var/www/speaking-test-booking`
- [ ] Set correct file permissions: `sudo chown -R deploy:deploy /var/www/speaking-test-booking`
- [ ] Install dependencies: `npm install`
- [ ] Build application: `npm run build`
- [ ] Run database migrations: `cd backend && npx prisma migrate deploy`

### Service Configuration
- [ ] Copy PM2 ecosystem configuration
- [ ] Start PM2 processes: `pm2 start ecosystem.config.js --env production`
- [ ] Save PM2 configuration: `pm2 save`
- [ ] Set up PM2 startup script: `pm2 startup`
- [ ] Verify PM2 processes: `pm2 status`

### Web Server Configuration
- [ ] Copy Nginx configuration to sites-available
- [ ] Enable site: `sudo ln -sf /etc/nginx/sites-available/speaking-test-booking /etc/nginx/sites-enabled/`
- [ ] Remove default site: `sudo rm -f /etc/nginx/sites-enabled/default`
- [ ] Test Nginx configuration: `sudo nginx -t`
- [ ] Restart Nginx: `sudo systemctl restart nginx`

## Monitoring and Backup Setup

### Monitoring
- [ ] Install monitoring service: `sudo cp deployment/speaking-test-monitor.service /etc/systemd/system/`
- [ ] Enable monitoring service: `sudo systemctl enable speaking-test-monitor`
- [ ] Start monitoring service: `sudo systemctl start speaking-test-monitor`
- [ ] Verify monitoring: `sudo systemctl status speaking-test-monitor`

### Backup Configuration
- [ ] Verify backup script permissions: `ls -la /usr/local/bin/backup-speaking-test.sh`
- [ ] Test manual backup: `/usr/local/bin/backup-speaking-test.sh`
- [ ] Verify cron job: `crontab -l`
- [ ] Check backup directory: `ls -la /var/backups/speaking-test-booking/`

### Log Management
- [ ] Verify log directories exist: `ls -la /var/log/speaking-test-booking/`
- [ ] Check log rotation configuration: `cat /etc/logrotate.d/speaking-test-booking`
- [ ] Test log rotation: `sudo logrotate -d /etc/logrotate.d/speaking-test-booking`

## Testing and Verification

### Health Checks
- [ ] Test basic health endpoint: `curl http://localhost:3001/health`
- [ ] Test detailed health endpoint: `curl http://localhost:3001/health/detailed`
- [ ] Test external access: `curl https://your-domain.com/health`
- [ ] Verify SSL certificate: `curl -I https://your-domain.com`

### Application Testing
- [ ] Test student login flow
- [ ] Test staff login flow
- [ ] Test booking creation
- [ ] Test SMS notifications (if configured)
- [ ] Test assessment recording
- [ ] Test admin functions
- [ ] Test cross-browser compatibility
- [ ] Test mobile responsiveness

### Performance Testing
- [ ] Test application load time
- [ ] Test database query performance
- [ ] Test concurrent user handling
- [ ] Monitor memory usage: `htop`
- [ ] Monitor disk usage: `df -h`

### Security Testing
- [ ] Test rate limiting
- [ ] Test authentication security
- [ ] Test SQL injection protection
- [ ] Test XSS protection
- [ ] Verify HTTPS redirect
- [ ] Test fail2ban configuration

## Post-Deployment Tasks

### Documentation
- [ ] Update deployment documentation with server-specific details
- [ ] Document environment-specific configurations
- [ ] Create runbook for common operations
- [ ] Document backup and recovery procedures

### Monitoring Setup
- [ ] Configure external monitoring (if applicable)
- [ ] Set up alerting for critical issues
- [ ] Configure log aggregation (if applicable)
- [ ] Set up performance monitoring

### Team Access
- [ ] Provide team members with necessary access
- [ ] Share deployment documentation
- [ ] Configure deployment keys/credentials
- [ ] Set up monitoring dashboard access

## Maintenance Schedule

### Daily
- [ ] Monitor application health
- [ ] Check error logs
- [ ] Verify backup completion
- [ ] Monitor system resources

### Weekly
- [ ] Review security logs
- [ ] Check SSL certificate status
- [ ] Review performance metrics
- [ ] Update system packages

### Monthly
- [ ] Run database maintenance
- [ ] Review and rotate logs
- [ ] Update dependencies
- [ ] Security audit
- [ ] Backup verification

## Emergency Procedures

### Rollback Plan
- [ ] Document rollback procedure
- [ ] Test rollback process
- [ ] Identify rollback triggers
- [ ] Prepare emergency contacts

### Incident Response
- [ ] Document incident response plan
- [ ] Identify escalation procedures
- [ ] Prepare communication templates
- [ ] Test disaster recovery

## Sign-off

### Technical Review
- [ ] Code review completed
- [ ] Security review completed
- [ ] Performance review completed
- [ ] Documentation review completed

### Stakeholder Approval
- [ ] Technical lead approval
- [ ] Security team approval
- [ ] Operations team approval
- [ ] Business stakeholder approval

### Final Verification
- [ ] All checklist items completed
- [ ] Production environment tested
- [ ] Monitoring confirmed working
- [ ] Backup and recovery tested
- [ ] Team trained on operations

---

**Deployment Date:** _______________

**Deployed by:** _______________

**Reviewed by:** _______________

**Production URL:** _______________

**Notes:**
_________________________________
_________________________________
_________________________________