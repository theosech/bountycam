const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigrations() {
  console.log('🚀 Running Supabase migrations...\n');

  const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
  
  try {
    // Read all migration files
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    for (const file of sqlFiles) {
      console.log(`📄 Running migration: ${file}`);
      
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, 'utf8');
      
      // Split by semicolons but be careful with functions
      const statements = sql
        .split(/;\s*$/m)
        .filter(stmt => stmt.trim())
        .map(stmt => stmt.trim() + ';');

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            const { error } = await supabase.rpc('exec_sql', { 
              query: statement 
            }).catch(() => {
              // If exec_sql doesn't exist, try direct query
              return supabase.from('_dummy_').select().throwOnError();
            });

            if (error) {
              // Try using the REST API directly
              const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                  'apikey': supabaseServiceKey,
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: statement })
              }).catch(() => null);

              if (!response || !response.ok) {
                console.log(`   ⚠️  Note: Direct SQL execution not available via API`);
                console.log(`   📋 Please run this statement manually in Supabase SQL Editor`);
              }
            }
          } catch (err) {
            console.log(`   ⚠️  Error: ${err.message}`);
          }
        }
      }
      
      console.log(`   ✅ Processed ${file}\n`);
    }

    console.log('\n📝 Migration Summary:');
    console.log('   - Initial schema with users, bounties, sessions tables');
    console.log('   - Row Level Security policies');
    console.log('   - RPC functions for nearby_bounties, accept_bounty, finish_session');
    console.log('\n⚠️  IMPORTANT: Please go to your Supabase Dashboard and:');
    console.log('   1. Navigate to SQL Editor');
    console.log('   2. Run each migration file in order:');
    sqlFiles.forEach(file => {
      console.log(`      - ${file}`);
    });
    console.log('\n   The migrations are in the supabase/migrations/ directory');

  } catch (error) {
    console.error('Error running migrations:', error);
  }
}

// Also create a helper to check if tables exist
async function checkTables() {
  console.log('\n🔍 Checking existing tables...\n');
  
  const { data: tables, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_name', ['users', 'bounties', 'sessions']);

  if (error) {
    console.log('Could not check tables via API');
  } else if (tables) {
    console.log('Existing tables:', tables.map(t => t.table_name).join(', ') || 'none');
  }
}

async function main() {
  await checkTables();
  await runMigrations();
}

main();