import { createClient } from '@supabase/supabase-js';

/** Publishable key only — safe to ship to the browser. Every table has
 * `revoke all ... from anon` (see supabase/001_schema.sql); the only access
 * this key grants is executing the SECURITY DEFINER RPCs explicitly granted
 * to `anon` (e.g. dashboard_report), which choose what to return. */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
