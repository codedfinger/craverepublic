import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "./lib/supabase";
import { z } from "zod";

const OrderItemSchema = z.object({
  menuItemId: z.number(),
  name: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().int().positive(),
});

const PlaceOrderSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().optional().nullable(),
  customerNote: z.string().optional().nullable(),
  items: z.array(OrderItemSchema).min(1),
});

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

  const parsed = PlaceOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid order data" });
  }

  const { customerName, customerPhone, customerNote, items } = parsed.data;
  const totalAmount = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  try {
    const { data, error } = await supabase
      .from("orders")
      .insert({
        customer_name: customerName,
        customer_phone: customerPhone ?? null,
        customer_note: customerNote ?? null,
        items,
        total_amount: totalAmount,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    sendOrderEmail({
      id: data.id,
      customerName: data.customer_name,
      customerPhone: data.customer_phone,
      customerNote: data.customer_note,
      items: items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
      totalAmount: data.total_amount,
    }).catch((err) => console.error("Email send failed:", err));

    return res.status(201).json({
      id: data.id,
      customerName: data.customer_name,
      customerPhone: data.customer_phone ?? null,
      customerNote: data.customer_note ?? null,
      items: data.items,
      totalAmount: data.total_amount,
      status: data.status,
      createdAt: data.created_at,
    });
  } catch (err) {
    console.error("Failed to place order:", err);
    return res.status(500).json({ error: "Failed to place order" });
  }
}
