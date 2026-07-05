import { useQuery } from "@tanstack/react-query";
import { supabase, type MenuItem } from "@/lib/supabase";

async function fetchMenu(): Promise<MenuItem[]> {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .order("category")
    .order("id");

  if (error) throw error;
  return data ?? [];
}

export function useMenu() {
  return useQuery({
    queryKey: ["menu"],
    queryFn: fetchMenu,
  });
}
