import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";
import { getSupabase } from "./lib/supabase";
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
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set — order email was not sent");
    return;
  }

  const to = process.env.ORDER_NOTIFICATION_EMAIL ?? "alexyikeh@gmail.com";
  const from =
    process.env.RESEND_FROM_EMAIL ?? "Crave Republic <onboarding@resend.dev>";

  const itemsList = order.items
    .map(
      (item) =>
        `• ${item.quantity}x ${item.name} — ₦${(item.price * item.quantity).toLocaleString()}`,
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

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: `New Order #${order.id} from ${order.customerName}`,
    text: emailBody,
  });

  if (error) {
    console.error("Resend email failed:", JSON.stringify(error));
    return;
  }

  console.log("Order email sent:", data?.id);
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
    0,
  );

  try {
    const { data, error } = await getSupabase()
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

    // Must await before responding — Vercel kills the function after the response.
    try {
      await sendOrderEmail({
        id: data.id,
        customerName: data.customer_name,
        customerPhone: data.customer_phone,
        customerNote: data.customer_note,
        items: items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
        })),
        totalAmount: data.total_amount,
      });
    } catch (emailErr) {
      console.error("Email send failed:", emailErr);
    }

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
