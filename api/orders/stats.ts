import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabase } from "../lib/supabase";
import type { OrderItem } from "../lib/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data: orders, error } = await getSupabase()
      .from("orders")
      .select("total_amount, items")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
      (sum, o) => sum + (o.total_amount as number),
      0
    );

    const itemCounts: Record<string, number> = {};
    for (const order of orders) {
      for (const item of (order.items as OrderItem[]) ?? []) {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
      }
    }

    const popularItems = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return res.json({ totalOrders, totalRevenue, popularItems });
  } catch (err) {
    console.error("Failed to get order stats:", err);
    return res.status(500).json({ error: "Failed to get stats" });
  }
}
