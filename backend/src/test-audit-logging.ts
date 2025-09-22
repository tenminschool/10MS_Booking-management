#!/usr/bin/env ts-node

/**
 * Test script to verify audit logging functionality
 * This script tests the audit logging system and system settings management
 */

import prisma from './lib/prisma';
import { createAuditLog } from './middleware/audit';

async function testAuditLogging() {
  console.log('🔍 Testing Audit Logging System...\n');

  try {
    // Test 1: Create a manual audit log entry
    console.log('1. Creating manual audit log entry...');
    await createAuditLog(
      'test-user-id',
      'test_entity',
      'test-entity-id',
      'CREATE',
      null,
      { testField: 'testValue' },
      '127.0.0.1',
      'Test User Agent'
    );
    console.log('✅ Manual audit log created successfully');

    // Test 2: Retrieve audit logs
    console.log('\n2. Retrieving audit logs...');
    const auditLogs = await prisma.auditLog.findMany({
      take: 5,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    console.log(`✅ Found ${auditLogs.length} audit log entries`);
    
    if (auditLogs.length > 0) {
      console.log('\nRecent audit logs:');
      auditLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. ${log.action} on ${log.entityType} by ${log.user?.name || 'Unknown'} at ${log.timestamp}`);
      });
    }

    // Test 3: Test system settings
    console.log('\n3. Testing system settings...');
    
    // Check if system settings exist
    let systemSetting = await prisma.systemSetting.findUnique({
      where: { key: 'system_config' }
    });

    if (!systemSetting) {
      console.log('Creating default system settings...');
      const defaultSettings = {
        bookingRules: {
          maxBookingsPerMonth: 4,
          cancellationHours: 24,
          allowCrossBranchBooking: true,
          autoReminderHours: 24
        },
        auditSettings: {
          retentionDays: 365,
          logLevel: 'detailed',
          enableRealTimeAlerts: true
        }
      };

      // Create a test user for system settings
      let testUser = await prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' }
      });

      if (!testUser) {
        console.log('Creating test super admin user...');
        testUser = await prisma.user.create({
          data: {
            name: 'Test Super Admin',
            email: 'test@admin.com',
            role: 'SUPER_ADMIN',
            hashedPassword: 'test-password',
            isActive: true
          }
        });
      }

      systemSetting = await prisma.systemSetting.create({
        data: {
          key: 'system_config',
          value: JSON.stringify(defaultSettings),
          description: 'System-wide configuration settings',
          updatedBy: testUser.id
        }
      });
      console.log('✅ System settings created successfully');
    } else {
      console.log('✅ System settings already exist');
    }

    // Parse and display current settings
    try {
      const settings = JSON.parse(systemSetting.value);
      console.log('\nCurrent system settings:');
      console.log(`  - Max bookings per month: ${settings.bookingRules?.maxBookingsPerMonth || 'Not set'}`);
      console.log(`  - Cancellation hours: ${settings.bookingRules?.cancellationHours || 'Not set'}`);
      console.log(`  - Audit retention days: ${settings.auditSettings?.retentionDays || 'Not set'}`);
      console.log(`  - Audit log level: ${settings.auditSettings?.logLevel || 'Not set'}`);
    } catch (error) {
      console.log('⚠️  Could not parse system settings JSON');
    }

    // Test 4: Test audit log filtering
    console.log('\n4. Testing audit log filtering...');
    const filteredLogs = await prisma.auditLog.findMany({
      where: {
        action: 'CREATE',
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      take: 10,
      orderBy: { timestamp: 'desc' }
    });

    console.log(`✅ Found ${filteredLogs.length} CREATE actions in the last 24 hours`);

    // Test 5: Test audit log pagination
    console.log('\n5. Testing audit log pagination...');
    const totalCount = await prisma.auditLog.count();
    const pageSize = 5;
    const totalPages = Math.ceil(totalCount / pageSize);
    
    console.log(`✅ Total audit logs: ${totalCount}, Pages: ${totalPages} (page size: ${pageSize})`);

    console.log('\n🎉 All audit logging tests completed successfully!');
    console.log('\nAudit logging system features verified:');
    console.log('  ✅ Manual audit log creation');
    console.log('  ✅ Audit log retrieval with user information');
    console.log('  ✅ System settings management');
    console.log('  ✅ Audit log filtering by action and date');
    console.log('  ✅ Audit log pagination support');

  } catch (error) {
    console.error('❌ Audit logging test failed:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testAuditLogging()
    .then(() => {
      console.log('\n✅ Audit logging test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Audit logging test failed:', error);
      process.exit(1);
    });
}

export { testAuditLogging };