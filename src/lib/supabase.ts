import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// New marketplace types based on your schema
export interface Listing {
  id: string;
  created_at: string;
  updated_at: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  category: string | null;
  status: 'active' | 'pending' | 'sold' | 'canceled';
  location: string | null;
  url: string | null;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  url: string;
  idx: number;
}

export interface ListingWithImages extends Listing {
  images: ListingImage[];
}

// Keep the old Alert type for backward compatibility
export interface Alert {
  id: string;
  created_at: string;
  source: string;
  title: string;
  price: number | null;
  currency: string;
  url: string;
  location: string;
  posted_at: string;
  images: string[];
  meta: {
    condition?: string;
    seller?: string;
    note?: string;
    [key: string]: unknown;
  };
  listing_status?: string;
  last_checked?: string;
}
