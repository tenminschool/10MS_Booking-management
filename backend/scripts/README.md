# Backend Scripts

This directory contains various scripts for database management, testing, and setup.

## 📁 Directory Structure

### `/database/` - Database Management Scripts
SQL and JS scripts for managing database data, migrations, and maintenance.

**Data Generation:**
- `add-*.sql` - Scripts to add specific users/data
- `create-demo-*.sql` - Create demo data for development
- `create-showcase-*.sql` - Create showcase/example data
- `create-student-*.sql` - Student account creation scripts
- `insert-*.sql` - Insert specific data records

**Migrations & Maintenance:**
- `database-updates-*.sql` - Database schema updates
- `migrate-*.js` - Migration scripts
- `remove-optional-tables.sql` - Clean up optional tables

### `/setup/` - Initial Setup Scripts
Scripts for initial database and infrastructure setup.

- `setup-database.sql` - Main database schema setup
- `setup-supabase.js` - Supabase configuration
- `supabase-setup-simple.sql` - Simplified Supabase setup

### `/testing/` - Testing & Validation Scripts
Scripts for testing database connections, validating schema, and running tests.

- `test-*.js` - Various test scripts
- `check-*.js` - Validation check scripts
- `validate-*.js` - Schema validation scripts
- `comprehensive-test.js` - Full system test

## 🚫 Git Ignore

These scripts are **excluded from git** by default (see `.gitignore`) as they are:
- Temporary development tools
- Contain test/demo data
- Generated for local development only

## 📝 Usage

### Running Database Scripts
```bash
# Execute SQL scripts
npm run db:execute scripts/database/your-script.sql

# Run JS scripts
node scripts/database/your-script.js
```

### Running Tests
```bash
# Run all tests
npm run test

# Run specific test
node scripts/testing/test-db-direct.js
```

## ⚠️ Important Notes

1. **Never commit sensitive data** - These scripts may contain test credentials
2. **Use in development only** - Not for production environments
3. **Keep organized** - Place new scripts in the appropriate subdirectory
4. **Document changes** - Update this README when adding new script categories

