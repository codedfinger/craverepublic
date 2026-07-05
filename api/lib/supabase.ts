import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) must be set",
      );
    }

    client = createClient(supabaseUrl, supabaseKey);
  }

  return client;
}

export type MenuItem = {
  id: number;
  name: string;
  category: string;
  description: string | null;
  price: number;
};

export type OrderItem = {
  menuItemId: number;
  name: string;
  quantity: number;
  price: number;
};

export type Order = {
  id: number;
  customer_name: string;
  customer_phone: string | null;
  customer_note: string | null;
  items: OrderItem[];
  total_amount: number;
  status: string;
  created_at: string;
};
