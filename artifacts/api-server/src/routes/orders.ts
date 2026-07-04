import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { desc, count, sum } from "drizzle-orm";
import { PlaceOrderBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router = Router();

async function sendOrderEmail(order: {
  id: number;
  customerName: string;
  customerPhone: string | null;
  customerNote: string | null;
  items: Array<{ name: string; quantity: number; price: number }>;
  totalAmount: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn("RESEND_API_KEY not set — skipping email notification");
    return;
  }

  const itemsList = order.items
    .map((item) => `• ${item.quantity}x ${item.name} — ₦${(item.price * item.quantity).toLocaleString()}`)
    .join("\n");

  const emailBody = `
New Order #${order.id} — Crave Republic

Customer: ${order.customerName}
Phone: ${order.customerPhone || "Not provided"}
Note: ${order.customerNote || "None"}

Items:
${itemsList}

Total: ₦${order.totalAmount.toLocaleString()}
  `.trim();

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Crave Republic Orders <orders@resend.dev>",
        to: ["alexyikeh@gmail.com"],
        subject: `New Order #${order.id} from ${order.customerName}`,
        text: emailBody,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error({ status: response.status, body: text }, "Failed to send order email");
    } else {
      logger.info({ orderId: order.id }, "Order email sent");
    }
  } catch (err) {
    logger.error({ err }, "Error sending order email");
  }
}

router.post("/orders", async (req, res) => {
  const parsed = PlaceOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid order data" });
    return;
  }

  const { customerName, customerPhone, customerNote, items } = parsed.data;

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  try {
    const [order] = await db
      .insert(ordersTable)
      .values({
        customerName,
        customerPhone: customerPhone ?? null,
        customerNote: customerNote ?? null,
        items,
        totalAmount,
        status: "pending",
      })
      .returning();

    sendOrderEmail({
      id: order.id,
      customerName: order.customerName,
      customerPhone: order.customerPhone ?? null,
      customerNote: order.customerNote ?? null,
      items: items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
      totalAmount: order.totalAmount,
    }).catch((err) => logger.error({ err }, "Email send failed"));

    res.status(201).json({
      id: order.id,
      customerName: order.customerName,
      customerPhone: order.customerPhone ?? null,
      customerNote: order.customerNote ?? null,
      items: order.items,
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to place order");
    res.status(500).json({ error: "Failed to place order" });
  }
});

router.get("/orders/stats", async (req, res) => {
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
      for (const item of order.items as Array<{ name: string; quantity: number }>) {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
      }
    }

    const popularItems = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    res.json({
      totalOrders: Number(stats?.totalOrders ?? 0),
      totalRevenue: Number(stats?.totalRevenue ?? 0),
      popularItems,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get order stats");
    res.status(500).json({ error: "Failed to get stats" });
  }
});

export default router;
