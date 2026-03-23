// ── send-password-reset Edge Function ────────────────────────────────────────
// Sends a password reset email via Resend.
// This function is used by forgotPassword() in api.js.
//
// NOTE: Supabase Auth's resetPasswordForEmail() sends its own built-in
// reset email by default. This Edge Function is available as an override
// if custom email branding is required (configured in Supabase Auth settings:
// Dashboard > Auth > Email Templates — disable built-in, invoke custom function).
//
// For Stage 2, forgotPassword() in api.js uses Supabase Auth's built-in
// resetPasswordForEmail() which sends the reset link automatically.
// This Edge Function is deployed for completeness and future use when
// custom email templates are configured.
//
// Required body fields:
//   email        string   — recipient address
//   resetLink    string   — the password reset URL (with Supabase token embedded)
//
// Environment:
//   RESEND_API_KEY — Supabase secret
//   APP_URL        — base URL (Supabase secret or default)
//
// Authentication: requires a valid JWT.
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
    console.error("send-password-reset: RESEND_API_KEY not set");
    return new Response(JSON.stringify({ error: "Email service not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: {
    email?: string;
    resetLink?: string;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { email, resetLink } = body;

  if (!email || !resetLink) {
    return new Response(
      JSON.stringify({ error: "email and resetLink are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

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
              <h2 style="color: #e0e0e0; font-size: 20px;">Reset Your Password</h2>
              <p style="color: #d1d5db; line-height: 1.6;">
                We received a request to reset the password for your GritFit account.
                Click the button below to choose a new password.
              </p>
              <p style="color: #9ca3af; font-size: 13px;">
                This link expires in <strong>1 hour</strong>.
                If you did not request a password reset, ignore this email — your account is safe.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetLink}"
                   style="background-color: #6ed430; color: #0e1117; font-weight: bold;
                          font-size: 16px; padding: 14px 32px; border-radius: 6px;
                          text-decoration: none; display: inline-block;">
                  Reset Password
                </a>
              </div>
              <p style="color: #6b7280; font-size: 12px; word-break: break-all;">
                If the button does not work, paste this link into your browser:<br />
                <a href="${resetLink}" style="color: #6ed430;">${resetLink}</a>
              </p>
              <hr style="border-color: #2d3748; margin: 24px 0;" />
              <p style="color: #6b7280; font-size: 12px;">
                This email was sent to ${email}.
                If you did not request a password reset, no action is needed.
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
Reset Your GritFit Password

We received a request to reset your password.

Reset your password here:
${resetLink}

This link expires in 1 hour.
If you did not request a password reset, ignore this email.

---
Sent to ${email}.
`.trim();

  const payload = {
    from:    FROM_ADDRESS,
    to:      [email],
    subject: "Reset Your GritFit Password",
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
    console.error(`send-password-reset: Resend API error ${resendResponse.status}: ${errText}`);
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
