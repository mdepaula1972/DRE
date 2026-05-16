import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function initStorage() {
  console.log('--- Initializing Branding Storage ---');
  
  // 1. Create the bucket
  const { data, error } = await supabase.storage.createBucket('company-branding', {
    public: true,
    fileSizeLimit: 2097152, // 2MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
  });

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('Bucket "company-branding" already exists.');
    } else {
      console.error('Error creating bucket:', error);
      return;
    }
  } else {
    console.log('Bucket "company-branding" created successfully.');
  }

  console.log('--- Storage Ready ---');
}

initStorage();
