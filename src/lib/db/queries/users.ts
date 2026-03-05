import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Profile, Contact, OnboardingData } from '../types';

type Client = SupabaseClient<Database>;

export async function getProfile(
  supabase: Client,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as Profile | null) ?? null;
}

export async function getOnboardingData(
  supabase: Client,
  userId: string
): Promise<OnboardingData | null> {
  const { data, error } = await supabase
    .from('onboarding_data')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as OnboardingData | null) ?? null;
}

export async function getVipContacts(
  supabase: Client,
  userId: string
): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_vip', true);

  if (error) throw error;
  return (data ?? []) as Contact[];
}

export async function getColdContacts(
  supabase: Client,
  userId: string
): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_cold', true);

  if (error) throw error;
  return (data ?? []) as Contact[];
}
