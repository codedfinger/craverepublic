import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db, ordersTable } from "@workspace/db";
import { PlaceOrderBody } from "@workspace/api-zod";

async function sendOrderEmail(order: {
  id: number;
  customerName: string;
  customerPhone: string | null;
  customerNote: string | null;
  items: Array<{ name: string; quantity: number; price: number }>;
  totalAmount: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const itemsList = order.items
    .map(
      (item) =>
        `• ${item.quantity}x ${item.name} — ₦${(item.price * item.quantity).toLocaleString()}`
    )
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

  await fetch("https://api.resend.com/emails", {
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
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const parsed = PlaceOrderBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid order data" });
  }

  const { customerName, customerPhone, customerNote, items } = parsed.data;
  const totalAmount = items.reduce(
    (acc: number, item: { price: number; quantity: number }) =>
      acc + item.price * item.quantity,
    0
  );

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
      items: items.map((i: { name: string; quantity: number; price: number }) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      })),
      totalAmount: order.totalAmount,
    }).catch((err) => console.error("Email send failed:", err));

    return res.status(201).json({
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
    console.error("Failed to place order:", err);
    return res.status(500).json({ error: "Failed to place order" });
  }
}
