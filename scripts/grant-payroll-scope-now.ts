import 'dotenv/config';
import { db } from '../server/db';
import { appConfig } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface ManagedKey {
  id: string;
  name: string;
  prefix: string;
  hash: string;
  scopes: string[];
  createdAt: string;
  createdBy: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
}

async function main() {
  try {
    console.log('📋 Fetching managed API keys...\n');
    
    const config = await db.query.appConfig.findFirst({
      where: eq(appConfig.key, 'api_keys_managed'),
    });
    
    if (!config || !config.value) {
      console.log('❌ No managed keys found in database');
      process.exit(1);
    }
    
    const keys: ManagedKey[] = JSON.parse(config.value);
    console.log(`✅ Found ${keys.length} API key(s)\n`);
    
    keys.forEach((k, i) => {
      const status = k.revokedAt ? '🚫 REVOKED' : '✅ ACTIVE';
      console.log(`${i + 1}. ${k.name} [${status}]`);
      console.log(`   ID: ${k.id}`);
      console.log(`   Scopes: ${k.scopes.length > 0 ? k.scopes.join(', ') : '(none)'}`);
      console.log();
    });
    
    // Find Payroll key
    const payrollKey = keys.find(k => 
      !k.revokedAt && (
        k.name.toLowerCase().includes('payroll') || 
        k.name.toLowerCase().includes('sync')
      )
    );
    
    if (!payrollKey) {
      console.log('❌ Could not find Payroll key\n');
      process.exit(1);
    }
    
    console.log(`🎯 Found Payroll key: ${payrollKey.name}`);
    
    if (payrollKey.scopes.includes('applications:read')) {
      console.log('✅ Already has applications:read scope\n');
      process.exit(0);
    }
    
    console.log('💾 Granting applications:read scope...');
    payrollKey.scopes.push('applications:read');
    
    await db.update(appConfig)
      .set({ value: JSON.stringify(keys) })
      .where(eq(appConfig.key, 'api_keys_managed'));
    
    console.log(`✅ Success!\n`);
    console.log(`   Key: ${payrollKey.name}`);
    console.log(`   ID: ${payrollKey.id}`);
    console.log(`   Updated scopes: ${payrollKey.scopes.join(', ')}\n`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
