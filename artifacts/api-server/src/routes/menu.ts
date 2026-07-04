import { Router } from "express";
import { db } from "@workspace/db";
import { menuItemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/menu", async (req, res) => {
  try {
    const items = await db.select().from(menuItemsTable).orderBy(menuItemsTable.category, menuItemsTable.id);
    res.json(items);
  } catch (err) {
    req.log.error({ err }, "Failed to get menu");
    res.status(500).json({ error: "Failed to fetch menu" });
  }
});

export default router;
