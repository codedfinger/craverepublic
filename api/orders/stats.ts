import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db, ordersTable } from "@workspace/db";
import { desc, count, sum } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const [stats] = await db
      .select({
        totalOrders: count(ordersTable.id),
        totalRevenue: sum(ordersTable.totalAmount),
      })
      .from(ordersTable);

    const allOrders = await db
      .select({ items: ordersTable.items })
      .from(ordersTable)
      .orderBy(desc(ordersTable.createdAt))
      .limit(100);

    const itemCounts: Record<string, number> = {};
    for (const order of allOrders) {
      for (const item of order.items as Array<{
        name: string;
        quantity: number;
      }>) {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
      }
    }

    const popularItems = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return res.json({
      totalOrders: Number(stats?.totalOrders ?? 0),
      totalRevenue: Number(stats?.totalRevenue ?? 0),
      popularItems,
    });
  } catch (err) {
    console.error("Failed to get order stats:", err);
    return res.status(500).json({ error: "Failed to get stats" });
  }
}
