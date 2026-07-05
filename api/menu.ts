import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabase } from "./lib/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { data, error } = await getSupabase()
      .from("menu_items")
      .select("*")
      .order("category")
      .order("id");

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error("Failed to get menu:", err);
    return res.status(500).json({ error: "Failed to fetch menu" });
  }
}
