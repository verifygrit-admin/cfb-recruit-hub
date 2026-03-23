// ── send-pending-account Edge Function ───────────────────────────────────────
// Sends the account setup email to a new recruit after saveRecruit() succeeds,
// or re-sends it when resendSetupEmail() is called (resend=true flag).
//
// Invoked via: supabase.functions.invoke('send-pending-account', { body: {...} })
//
// Required body fields:
//   said         string   — recruit SAID (e.g. GRIT-2026-0005)
//   name         string   — recruit's name (for email greeting)
//   email        string   — recipient address
//   pendingToken string   — UUID token for the setup link
//   resend?      boolean  — if true, this is a resend (subject line changes)
//
// Environment:
//   RESEND_API_KEY — Supabase secret (set via `supabase secrets set`)
//   APP_URL        — base URL for setup link (Supabase secret or default)
//
// Authentication: requires a valid JWT (anon or authenticated).
// RESEND_API_KEY is never exposed to the caller.
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_ADDRESS   = "noreply@grittyfb.com";
const DEFAULT_APP_URL = "https://verifygrit-admin.github.io/cfb-recruit-hub/";

serve(async (req: Request): Promise<Response> => {
  // Only accept POST.
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("send-pending-account: RESEND_API_KEY not set");
    return new Response(JSON.stringify({ error: "Email service not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: {
    said?: string;
    name?: string;
    email?: string;
    pendingToken?: string;
    resend?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { said, name, email, pendingToken, resend = false } = body;

  if (!said || !email || !pendingToken) {
    return new Response(
      JSON.stringify({ error: "said, email, and pendingToken are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const appUrl  = Deno.env.get("APP_URL") || DEFAULT_APP_URL;
  const setupLink = `${appUrl}?completeSAID=${encodeURIComponent(said)}&token=${encodeURIComponent(pendingToken)}`;
  const firstName = name ? name.split(" ")[0] : "Athlete";

  const subjectLine = resend
    ? "Your GritFit Account Setup Link (Resent)"
    : "Complete Your GritFit Account Setup";

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
              <p style="color: #9ca3af; font-size: 14px; margin-top: 0;">Your SAID: <strong style="color: #e0e0e0;">${said}</strong></p>
              <hr style="border-color: #2d3748; margin: 24px 0;" />
              <h2 style="color: #e0e0e0; font-size: 20px;">Hi ${firstName},</h2>
              <p style="color: #d1d5db; line-height: 1.6;">
                ${resend
                  ? "You requested a new account setup link. Your previous link has been replaced."
                  : "Your recruit profile has been created on GritFit CFB Recruit Hub."}
                Complete your account setup by clicking the button below to choose your password.
              </p>
              <p style="color: #9ca3af; font-size: 13px;">
                This link expires in <strong>7 days</strong>. Do not share it with anyone.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${setupLink}"
                   style="background-color: #6ed430; color: #0e1117; font-weight: bold;
                          font-size: 16px; padding: 14px 32px; border-radius: 6px;
                          text-decoration: none; display: inline-block;">
                  Complete Account Setup
                </a>
              </div>
              <p style="color: #6b7280; font-size: 12px; word-break: break-all;">
                If the button does not work, paste this link into your browser:<br />
                <a href="${setupLink}" style="color: #6ed430;">${setupLink}</a>
              </p>
              <hr style="border-color: #2d3748; margin: 24px 0;" />
              <p style="color: #6b7280; font-size: 12px;">
                This email was sent to ${email} because a GritFit profile was created with this address.
                If you did not create an account, you can ignore this email.
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
Hi ${firstName},

${resend
    ? "You requested a new account setup link. Your previous link has been replaced."
    : "Your recruit profile has been created on GritFit CFB Recruit Hub."}

Complete your account setup here:
${setupLink}

This link expires in 7 days. Do not share it with anyone.

Your SAID: ${said}

---
Sent to ${email}. If you did not create an account, ignore this email.
`.trim();

  const payload = {
    from:    FROM_ADDRESS,
    to:      [email],
    subject: subjectLine,
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
    console.error(`send-pending-account: Resend API error ${resendResponse.status}: ${errText}`);
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
