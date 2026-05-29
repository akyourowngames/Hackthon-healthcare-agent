import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NotificationPayload = {
  notification_id?: number;
  user_id?: string;
  to?: string;
  subject?: string;
  body?: string;
  action_url?: string;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({ ok: true }, 200);
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Use POST." }, 405);
  }

  const payload = (await request.json().catch(() => ({}))) as NotificationPayload;
  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = requiredEnv("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Vaidy <notifications@vaidy.local>";
  const appUrl = Deno.env.get("VAIDY_APP_URL") || "";

  if (!supabaseUrl.ok || !serviceRoleKey.ok || !resendKey.ok) {
    return jsonResponse(
      { error: "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or RESEND_API_KEY." },
      500,
    );
  }

  const supabase = createClient(supabaseUrl.value, serviceRoleKey.value);
  const notification = await resolveNotification(supabase, payload);
  if (!notification.ok) {
    return jsonResponse({ error: notification.error }, notification.status);
  }

  const email = await resolveRecipientEmail(supabase, payload, notification.value.user_id);
  if (!email.ok) {
    return jsonResponse({ error: email.error }, email.status);
  }

  const actionUrl = payload.action_url || (appUrl ? `${appUrl}/dashboard` : "");
  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey.value}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: email.value,
      subject: notification.value.subject,
      text: notification.value.body,
      html: htmlEmail(notification.value.subject, notification.value.body, actionUrl),
    }),
  });

  const resendPayload = await resendResponse.json().catch(() => ({}));
  if (!resendResponse.ok) {
    return jsonResponse({ error: "Resend rejected the email.", detail: resendPayload }, 502);
  }

  if (notification.value.id) {
    await supabase
      .from("notification_outbox")
      .update({ status: "sent" })
      .eq("id", notification.value.id);
  }

  return jsonResponse({ ok: true, resend: resendPayload }, 200);
});

function requiredEnv(name: string): { ok: true; value: string } | { ok: false } {
  const value = Deno.env.get(name);
  if (!value) return { ok: false };
  return { ok: true, value };
}

async function resolveNotification(
  supabase: ReturnType<typeof createClient>,
  payload: NotificationPayload,
): Promise<
  | { ok: true; value: { id?: number; user_id: string; subject: string; body: string } }
  | { ok: false; status: number; error: string }
> {
  if (payload.notification_id) {
    const { data, error } = await supabase
      .from("notification_outbox")
      .select("id,user_id,subject,body")
      .eq("id", payload.notification_id)
      .single();
    if (error || !data) {
      return { ok: false, status: 404, error: "Notification not found." };
    }
    return {
      ok: true,
      value: {
        id: Number(data.id),
        user_id: String(data.user_id || ""),
        subject: String(data.subject || ""),
        body: String(data.body || ""),
      },
    };
  }

  if (!payload.user_id || !payload.subject || !payload.body) {
    return { ok: false, status: 400, error: "Provide notification_id or user_id, subject, and body." };
  }
  return {
    ok: true,
    value: {
      user_id: payload.user_id,
      subject: payload.subject,
      body: payload.body,
    },
  };
}

async function resolveRecipientEmail(
  supabase: ReturnType<typeof createClient>,
  payload: NotificationPayload,
  userId: string,
): Promise<{ ok: true; value: string } | { ok: false; status: number; error: string }> {
  if (payload.to) {
    return { ok: true, value: payload.to };
  }
  if (!userId) {
    return { ok: false, status: 400, error: "No user_id available for email lookup." };
  }
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) {
    return { ok: false, status: 404, error: "Could not resolve user email from Supabase Auth." };
  }
  return { ok: true, value: data.user.email };
}

function htmlEmail(subject: string, body: string, actionUrl: string) {
  const paragraphs = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
  const link = actionUrl
    ? `<p><a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:12px 16px;background:#00d97e;color:#03120a;text-decoration:none;border-radius:8px;font-weight:700;">View full analysis</a></p>`
    : "";
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111827;"><h2>${escapeHtml(subject)}</h2>${paragraphs}${link}<p style="color:#6b7280;font-size:12px;">For informational purposes only. Discuss medical decisions with a clinician.</p></body></html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function jsonResponse(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
