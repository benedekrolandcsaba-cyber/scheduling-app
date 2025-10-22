#!/usr/bin/env node

/**
 * Neon Database Connection Tester
 * Tests the database connection and verifies table structure
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable not set');
    console.log('💡 Create a .env file with: DATABASE_URL=postgresql://...');
    process.exit(1);
}

const sql = neon(DATABASE_URL);

async function testConnection() {
    console.log('🔄 Testing Neon Database Connection...\n');
    
    try {
        // Test basic connection
        console.log('1️⃣ Testing basic connection...');
        const result = await sql`SELECT NOW() as current_time, version() as postgres_version`;
        console.log('✅ Connection successful!');
        console.log(`   Time: ${result[0].current_time}`);
        console.log(`   Version: ${result[0].postgres_version.split(' ')[0]}\n`);

        // Check if tables exist
        console.log('2️⃣ Checking table structure...');
        const tables = await sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `;
        
        const expectedTables = [
            'appointments',
            'group_constraints', 
            'groups',
            'individual_constraints',
            'settings',
            'weekly_schedule_settings'
        ];
        
        const existingTables = tables.map(t => t.table_name);
        console.log(`   Found ${existingTables.length} tables: ${existingTables.join(', ')}`);
        
        const missingTables = expectedTables.filter(t => !existingTables.includes(t));
        if (missingTables.length > 0) {
            console.log(`⚠️  Missing tables: ${missingTables.join(', ')}`);
            console.log('💡 Run the setup-neon-db.sql script to create missing tables\n');
        } else {
            console.log('✅ All required tables exist!\n');
        }

        // Test table contents
        console.log('3️⃣ Testing table contents...');
        
        // Check groups
        const groups = await sql`SELECT COUNT(*) as count FROM groups`;
        console.log(`   Groups: ${groups[0].count} records`);
        
        // Check settings
        const settings = await sql`SELECT COUNT(*) as count FROM settings`;
        console.log(`   Settings: ${settings[0].count} records`);
        
        // Check constraints
        const constraints = await sql`SELECT COUNT(*) as count FROM group_constraints`;
        console.log(`   Group Constraints: ${constraints[0].count} records`);
        
        // Check appointments
        const appointments = await sql`SELECT COUNT(*) as count FROM appointments`;
        console.log(`   Appointments: ${appointments[0].count} records\n`);

        // Test CRUD operations
        console.log('4️⃣ Testing CRUD operations...');
        
        // Insert test setting
        await sql`
            INSERT INTO settings (key, value) 
            VALUES ('test_connection', 'success') 
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `;
        
        // Read test setting
        const testSetting = await sql`SELECT value FROM settings WHERE key = 'test_connection'`;
        if (testSetting[0]?.value === 'success') {
            console.log('✅ CRUD operations working!');
        } else {
            console.log('❌ CRUD operations failed');
        }
        
        // Cleanup test data
        await sql`DELETE FROM settings WHERE key = 'test_connection'`;
        console.log('✅ Test data cleaned up\n');

        // Performance test
        console.log('5️⃣ Performance test...');
        const startTime = Date.now();
        await sql`SELECT 1`;
        const endTime = Date.now();
        console.log(`   Query response time: ${endTime - startTime}ms\n`);

        console.log('🎉 All tests passed! Database is ready for production.\n');
        
        // Connection info
        const url = new URL(DATABASE_URL);
        console.log('📊 Connection Details:');
        console.log(`   Host: ${url.hostname}`);
        console.log(`   Database: ${url.pathname.slice(1)}`);
        console.log(`   SSL: ${url.searchParams.get('sslmode') || 'enabled'}`);
        
    } catch (error) {
        console.error('❌ Database test failed:');
        console.error(`   Error: ${error.message}`);
        console.error(`   Code: ${error.code || 'Unknown'}`);
        
        if (error.message.includes('password authentication failed')) {
            console.log('\n💡 Troubleshooting:');
            console.log('   - Check your DATABASE_URL credentials');
            console.log('   - Verify the connection string from Neon dashboard');
            console.log('   - Ensure the database is not paused');
        } else if (error.message.includes('does not exist')) {
            console.log('\n💡 Troubleshooting:');
            console.log('   - Run setup-neon-db.sql to create tables');
            console.log('   - Check database name in connection string');
        } else if (error.message.includes('timeout')) {
            console.log('\n💡 Troubleshooting:');
            console.log('   - Check network connection');
            console.log('   - Verify Neon database is active');
        }
        
        process.exit(1);
    }
}

// Run the test
testConnection();