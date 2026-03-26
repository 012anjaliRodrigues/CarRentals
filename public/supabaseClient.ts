import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Mock Session (per phone number) ────────────────────────────────────────
// Each phone number gets its own unique Supabase email-based session.
// This means each owner has isolated data — drivers, vehicles, bookings etc.
// Mock OTP is 123456. When real Twilio is ready, delete this and use phone OTP.

export const ensureDevSession = async (phone: string): Promise<string | null> => {
  const mockEmail = `owner_${phone}@gaadidev.local`;
  const mockPassword = 'gaadizai_mock_2024';

  // If already signed in as this exact owner, reuse session
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.email === mockEmail) return session.user.id;

  // If signed in as a different owner, sign out first
  if (session?.user) {
    await supabase.auth.signOut();
  }

  // Try signing in (returning owner)
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: mockEmail,
    password: mockPassword,
  });
  if (!signInError && signInData.user) return signInData.user.id;

  // First time for this phone — create new account
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: mockEmail,
    password: mockPassword,
  });
  if (signUpError) {
    console.error('Mock signup failed:', signUpError.message);
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

  // Ensure  public.users row exists
  const { error: userInsertError } = await supabase
    .from('users')
    .insert({
      supabase_user_id: userId,
      phone: phone,
      role: 'owner',
      last_login_at: new Date().toISOString(),
    });

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