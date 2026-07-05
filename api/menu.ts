import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db, menuItemsTable } from "@workspace/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const items = await db
      .select()
      .from(menuItemsTable)
      .orderBy(menuItemsTable.category, menuItemsTable.id);
    return res.json(items);
  } catch (err) {
    console.error("Failed to get menu:", err);
    return res.status(500).json({ error: "Failed to fetch menu" });
  }
}
