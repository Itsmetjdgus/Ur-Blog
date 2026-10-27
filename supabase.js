const SUPABASE_URL = 'https://cojnocurzkfxofbmqiqm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_IS7ZzZbqtgAhShT47bykBQ_yaooRyv1';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);