import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to get current user (from Supabase Auth)
export const getCurrentUser = async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error('Error getting current session:', error);
    return null;
  }

  return session?.user || null;
};

// Helper function to get owner data for current auth user
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

// Helper: create owner row if it does not exist, and return owner
// userId: Supabase auth.users.id
// phone: E.164 phone (e.g. +919876543210) – currently only used for future extension
export const createOwnerIfNotExists = async (userId: string, phone: string) => {
  // Try to find existing owner for this auth user
  const { data: existingOwner, error: ownerSelectError } = await supabase
    .from('owners')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (ownerSelectError) {
    console.error('Error checking existing owner:', ownerSelectError);
    throw ownerSelectError;
  }

  if (existingOwner) {
    return existingOwner;
  }

  // Create a minimal owner row; onboarding will fill the rest
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