const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing supabase credentials", { supabaseUrl, supabaseServiceKey });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkConfig() {
  const { data, error } = await supabase
    .from('bot_config')
    .select('*')
    .eq('id', 'main')
    .single();

  if (error) {
    console.error("Database error:", error);
  } else {
    console.log("Current bot_config:", JSON.stringify(data, null, 2));
  }
}

checkConfig();
