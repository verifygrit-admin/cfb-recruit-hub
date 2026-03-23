// ── send-email-change Edge Function ──────────────────────────────────────────
// Sends an email change confirmation to the new email address.
// Used by requestEmailChangeMagicLink() in api.js.
//
// NOTE: Supabase Auth's updateUser({ email }) sends its own confirmation
// email by default. This Edge Function is available as a custom branded
// override (configure in Supabase Auth settings:
// Dashboard > Auth > Email Templates — disable built-in, invoke custom function).
//
// For Stage 2, requestEmailChangeMagicLink() uses supabase.auth.updateUser()
// which triggers Supabase's built-in email change flow automatically.
// This function is deployed for completeness and future custom branding.
//
// Required body fields:
//   newEmail     string   — the new email address (recipient)
//   oldEmail     string   — the current email address (for context in email body)
//   confirmLink  string   — the Supabase-generated email change confirmation URL
//
// Environment:
//   RESEND_API_KEY — Supabase secret
//
// Authentication: requires a valid JWT (authenticated only — email changes
// require an active session).
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_ADDRESS   = "noreply@grittyfb.com";

serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("send-email-change: RESEND_API_KEY not set");
    return new Response(JSON.stringify({ error: "Email service not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: {
    newEmail?: string;
    oldEmail?: string;
    confirmLink?: string;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { newEmail, oldEmail, confirmLink } = body;

  if (!newEmail || !confirmLink) {
    return new Response(
      JSON.stringify({ error: "newEmail and confirmLink are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const fromDisplay = oldEmail ? `changed from <strong>${oldEmail}</strong> to` : "updated to";

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="font-family: Arial, sans-serif; background-color: #0e1117; color: #e0e0e0; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0e1117; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1f2e; border-radius: 8px; padding: 40px;">
          <tr>
            <td>
              <h1 style="color: #6ed430; font-size: 24px; margin-bottom: 8px;">GritFit CFB Recruit Hub</h1>
              <hr style="border-color: #2d3748; margin: 24px 0;" />
              <h2 style="color: #e0e0e0; font-size: 20px;">Confirm Your New Email Address</h2>
              <p style="color: #d1d5db; line-height: 1.6;">
                A request was made to have your GritFit account email ${fromDisplay}
                <strong style="color: #e0e0e0;">${newEmail}</strong>.
              </p>
              <p style="color: #d1d5db; line-height: 1.6;">
                Click the button below to confirm this change. The link expires in <strong>24 hours</strong>.
              </p>
              <p style="color: #9ca3af; font-size: 13px;">
                If you did not request this change, ignore this email.
                Your current email address will remain active.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${confirmLink}"
                   style="background-color: #6ed430; color: #0e1117; font-weight: bold;
                          font-size: 16px; padding: 14px 32px; border-radius: 6px;
                          text-decoration: none; display: inline-block;">
                  Confirm Email Change
                </a>
              </div>
              <p style="color: #6b7280; font-size: 12px; word-break: break-all;">
                If the button does not work, paste this link into your browser:<br />
                <a href="${confirmLink}" style="color: #6ed430;">${confirmLink}</a>
              </p>
              <hr style="border-color: #2d3748; margin: 24px 0;" />
              <p style="color: #6b7280; font-size: 12px;">
                This confirmation email was sent to ${newEmail}.
                If you did not request an email change, no action is needed.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  const textBody = `
Confirm Your New Email Address — GritFit CFB Recruit Hub

A request was made to change your GritFit account email to: ${newEmail}

Confirm the change here:
${confirmLink}

This link expires in 24 hours.
If you did not request this change, ignore this email.

---
Sent to ${newEmail}.
`.trim();

  const payload = {
    from:    FROM_ADDRESS,
    to:      [newEmail],
    subject: "Confirm Your GritFit Email Change",
    html:    htmlBody,
    text:    textBody,
  };

  const resendResponse = await fetch(RESEND_API_URL, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resendResponse.ok) {
    const errText = await resendResponse.text();
    console.error(`send-email-change: Resend API error ${resendResponse.status}: ${errText}`);
    return new Response(
      JSON.stringify({ error: "Failed to send email", emailError: true }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
