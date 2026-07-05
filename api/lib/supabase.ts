import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

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
