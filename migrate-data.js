#!/usr/bin/env node

// Data Migration Script
// Run this to export data from Replit's Neon database to your local PostgreSQL

import { Pool } from 'pg';
import 'dotenv/config';

const REPLIT_DATABASE_URL = 'postgresql://neondb_owner:npg_eS2XhHPF4cUz@ep-soft-cell-ag25oai3.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const LOCAL_DATABASE_URL = process.env.DATABASE_URL;

async function exportData() {
  console.log('🔄 Starting data migration from Replit to Local...');
  
  const replitPool = new Pool({ connectionString: REPLIT_DATABASE_URL });
  const localPool = new Pool({ connectionString: LOCAL_DATABASE_URL });
  
  try {
    // List of tables to migrate (adjust based on your schema)
    const tables = [
      'users',
      'folders', 
      'chats',
      'messages',
      'drafts',
      'sessions'
    ];
    
    for (const table of tables) {
      try {
        console.log(`📋 Migrating table: ${table}`);
        
        // Export from Replit
        const result = await replitPool.query(`SELECT * FROM ${table}`);
        console.log(`   Found ${result.rows.length} rows`);
        
        if (result.rows.length > 0) {
          // Get column names
          const columns = Object.keys(result.rows[0]);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          const columnNames = columns.join(', ');
          
          // Insert into local database
          for (const row of result.rows) {
            const values = columns.map(col => row[col]);
            await localPool.query(
              `INSERT INTO ${table} (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
              values
            );
          }
          console.log(`   ✅ Migrated ${result.rows.length} rows to local database`);
        }
      } catch (error) {
        console.log(`   ⚠️  Table ${table} not found or error: ${error.message}`);
      }
    }
    
    console.log('🎉 Data migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await replitPool.end();
    await localPool.end();
  }
}

exportData();