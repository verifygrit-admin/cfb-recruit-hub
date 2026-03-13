import { useState } from "react";
import { createAccount, signIn, forgotPassword, resetPassword, completePendingAccount, resendSetupEmail } from "../lib/api.js";

export default function AuthModal({ initialView = "createAccount", prefillEmail = "", said, onAuth, onDismiss, onCreateNew, onReturn, pendingToken }) {
  const [view, setView]             = useState(initialView);
  const [email, setEmail]           = useState(prefillEmail);
  const [password, setPassword]     = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [resetCode, setResetCode]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmNewPw, setConfirmNewPw] = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [pendingSetup, setPendingSetup] = useState(false);  // orphan pending profile detected

  function clearErrors() { setError(null); setSuccessMsg(null); setPendingSetup(false); }

  function switchView(v) { clearErrors(); setPassword(""); setConfirmPw(""); setView(v); }

  async function handleCreateAccount() {
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPw) { setError("Passwords do not match."); return; }
    setLoading(true); setError(null);
    try {
      const r = pendingToken
        ? await completePendingAccount(said, pendingToken, password)
        : await createAccount(email, password, said);
      if (r.error) { setError(r.error); return; }
      onAuth({ said: r.said, email: r.email, sessionToken: r.sessionToken, profile: r.profile });
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  async function handleSignIn() {
    if (!email || !password) { setError("Email and password are required."); return; }
    setLoading(true); setError(null); setPendingSetup(false);
    try {
      const r = await signIn(email, password);
      if (r.error) {
        setError(r.error);
        if (r.pendingAccount) setPendingSetup(true);
        return;
      }
      onAuth({ said: r.said, email: r.email, sessionToken: r.sessionToken, profile: r.profile });
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  async function handleResendSetup() {
    setLoading(true); setError(null); setSuccessMsg(null);
    try {
      const r = await resendSetupEmail(email);
      if (r.error) { setError(r.error); return; }
      setPendingSetup(false);
      setSuccessMsg("Setup email resent — check your inbox to set your password.");
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  async function handleForgotPassword() {
    if (!email) { setError("Enter your email address."); return; }
    setLoading(true); setError(null);
    try {
      const r = await forgotPassword(email);
      if (r.error) { setError(r.error); return; }
      setSuccessMsg("Reset code sent — check your email. The code expires in 15 minutes.");
      setView("resetPassword");
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  async function handleResetPassword() {
    if (!resetCode || !newPw) { setError("All fields are required."); return; }
    if (newPw.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPw !== confirmNewPw) { setError("Passwords do not match."); return; }
    setLoading(true); setError(null);
    try {
      const r = await resetPassword(email, resetCode, newPw);
      if (r.error) { setError(r.error); return; }
      onAuth({ said: r.said, email: r.email, sessionToken: r.sessionToken, profile: r.profile });
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="auth-overlay">
      <div className="auth-modal">
        {onDismiss && (
          <button onClick={onDismiss} style={{
            position: "absolute", top: 12, right: 16,
            background: "none", border: "none", color: "var(--muted)",
            fontSize: 20, cursor: "pointer", lineHeight: 1,
          }}>×</button>
        )}
        <div className="auth-logo">Gritty<span>OS</span></div>

        {/* ── Create Account ── */}
        {view === "createAccount" && (
          <>
            <div className="auth-title">Create Your Account</div>
            <div className="auth-sub">Save your GRIT Fit results and access your Short List from any device.</div>
            {error && <div className="auth-error">{error}</div>}
            <div className="auth-field">
              <label>Email</label>
              <input type="email" value={email} readOnly tabIndex={-1} style={{ opacity: 0.6, cursor: "default" }} />
            </div>
            <div className="auth-field">
              <label>Password <span style={{ color: "#6b8c72", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— min 8 characters</span></label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Set a password" autoFocus />
            </div>
            <div className="auth-field">
              <label>Confirm Password</label>
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Confirm password"
                onKeyDown={e => e.key === "Enter" && handleCreateAccount()} />
            </div>
            <button className="auth-submit" onClick={handleCreateAccount} disabled={loading}>
              {loading ? "Creating Account…" : "Create Account & View Results →"}
            </button>
            <div className="auth-switch">
              Already have an account?{" "}
              <button onClick={() => switchView("signIn")}>Sign in instead</button>
            </div>
            {onReturn && (
              <div className="auth-return">
                <button onClick={onReturn}>← Return to Browsing Schools</button>
              </div>
            )}
          </>
        )}

        {/* ── Sign In ── */}
        {view === "signIn" && (
          <>
            <div className="auth-title">Sign In to GrittyOS</div>
            <div className="auth-sub">Access your GRIT Fit results, profile, and Short List.</div>
            {successMsg && <div className="auth-success">{successMsg}</div>}
            {error && <div className="auth-error">{error}</div>}
            {pendingSetup && (
              <button className="auth-submit" style={{ marginTop: 0, background: "#7c3aed" }} onClick={handleResendSetup} disabled={loading}>
                {loading ? "Sending…" : "Resend setup email →"}
              </button>
            )}
            <div className="auth-field">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email" autoFocus />
            </div>
            <div className="auth-field">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password"
                onKeyDown={e => e.key === "Enter" && handleSignIn()} />
            </div>
            <button className="auth-submit" onClick={handleSignIn} disabled={loading}>
              {loading ? "Signing In…" : "Sign In →"}
            </button>
            <div className="auth-switch">
              <button onClick={() => switchView("forgotPassword")}>Forgot password?</button>
              {said && (
                <> &nbsp;·&nbsp; <button onClick={() => onCreateNew ? onCreateNew() : switchView("createAccount")}>Create new account</button></>
              )}
            </div>
            {onReturn && (
              <div className="auth-return">
                <button onClick={onReturn}>← Return to Browsing Schools</button>
              </div>
            )}
          </>
        )}

        {/* ── Forgot Password ── */}
        {view === "forgotPassword" && (
          <>
            <div className="auth-title">Reset Your Password</div>
            <div className="auth-sub">Enter your email and we'll send a 6-digit reset code.</div>
            {error && <div className="auth-error">{error}</div>}
            <div className="auth-field">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email" autoFocus
                onKeyDown={e => e.key === "Enter" && handleForgotPassword()} />
            </div>
            <button className="auth-submit" onClick={handleForgotPassword} disabled={loading}>
              {loading ? "Sending…" : "Send Reset Code →"}
            </button>
            <div className="auth-switch">
              <button onClick={() => switchView("signIn")}>Back to Sign In</button>
            </div>
          </>
        )}

        {/* ── Reset Password ── */}
        {view === "resetPassword" && (
          <>
            <div className="auth-title">Enter Reset Code</div>
            {successMsg && <div className="auth-success">{successMsg}</div>}
            <div className="auth-sub">Check your email for the 6-digit code.</div>
            {error && <div className="auth-error">{error}</div>}
            <div className="auth-field">
              <label>6-Digit Code</label>
              <input type="text" value={resetCode} onChange={e => setResetCode(e.target.value)}
                placeholder="123456" maxLength={6} autoFocus style={{ letterSpacing: 4, fontSize: 20 }} />
            </div>
            <div className="auth-field">
              <label>New Password <span style={{ color: "#6b8c72", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— min 8 characters</span></label>
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password" />
            </div>
            <div className="auth-field">
              <label>Confirm New Password</label>
              <input type="password" value={confirmNewPw} onChange={e => setConfirmNewPw(e.target.value)} placeholder="Confirm new password"
                onKeyDown={e => e.key === "Enter" && handleResetPassword()} />
            </div>
            <button className="auth-submit" onClick={handleResetPassword} disabled={loading}>
              {loading ? "Resetting…" : "Reset Password & Sign In →"}
            </button>
            <div className="auth-switch">
              Didn't receive a code?{" "}
              <button onClick={() => { clearErrors(); setView("forgotPassword"); }}>Resend</button>
            </div>
          </>
        )}

        <div className="auth-footer">
          Support: <a href="mailto:verifygrit@gmail.com">verifygrit@gmail.com</a>
        </div>
      </div>
    </div>
  );
}
