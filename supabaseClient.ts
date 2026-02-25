import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Dev Session ────────────────────────────────────────────────────────────
// Creates a fake email-based auth session for dev/demo use.
// This lets RLS policies pass so all DB writes work without real phone OTP.
// In production this is never called — OTP flow creates the real session.

const DEV_EMAIL = 'dev_owner@gaadidev.local';
const DEV_PASSWORD = 'devpassword_gzai_2024';

export const ensureDevSession = async (): Promise<string | null> => {
  // If session already exists, return the user id
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) return session.user.id;

  // Try sign in first
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
  });

  if (!signInError && signInData.user) {
    return signInData.user.id;
  }

  // First time — sign up
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
  });

  if (signUpError) {
    console.error('Dev session creation failed:', signUpError.message);
    return null;
  }

  return signUpData.user?.id ?? null;
};

// ─── Auth Helpers ────────────────────────────────────────────────────────────

export const getCurrentUser = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting current session:', error);
    return null;
  }
  return session?.user || null;
};

export const getCurrentOwner = async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('owners')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.warn('No owner found for user:', error.message);
    return null;
  }

  return data;
};

// ─── Owner Bootstrap ─────────────────────────────────────────────────────────

export const createOwnerIfNotExists = async (userId: string, phone: string) => {
  const { data: existingOwner, error: ownerSelectError } = await supabase
    .from('owners')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (ownerSelectError) {
    console.error('Error checking existing owner:', ownerSelectError);
    throw ownerSelectError;
  }

  if (existingOwner) return existingOwner;

  // Also ensure public.users row exists
  const { error: userInsertError } = await supabase
    .from('users')
    .insert({
      supabase_user_id: userId,
      phone: phone,
      role: 'owner',
      last_login_at: new Date().toISOString(),
    });

  // Ignore conflict — row may already exist
  if (userInsertError && !userInsertError.message.includes('duplicate')) {
    console.warn('users insert warning:', userInsertError.message);
  }

  const { data: newOwner, error: insertError } = await supabase
    .from('owners')
    .insert({
      user_id: userId,
      full_name: '',
      business_name: '',
      email: null,
      business_address: '',
      base_location: 'Panjim',
      service_locations: ['Panjim'],
      onboarding_step: 1,
      onboarding_completed_at: null,
    })
    .select('*')
    .single();

  if (insertError) {
    console.error('Error creating owner:', insertError);
    throw insertError;
  }

  return newOwner;
};