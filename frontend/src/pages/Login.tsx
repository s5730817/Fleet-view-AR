import { useState, FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginUser, verify2FA } from "@/lib/api";

const Login = () => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);

  // ── 2FA STATE ─────────────────────────────────────────────
  const [requires2FA, setRequires2FA] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ── STEP 1: LOGIN (EMAIL + PASSWORD) ──────────────────────
  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await loginUser(email, password);

      // If backend requires 2FA → switch UI
      if (result.requires2FA) {
        setPendingEmail(result.email);
        setRequires2FA(true);
        return;
      }

      // Fallback (shouldn't happen with 2FA enabled)
      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));

      navigate("/dashboard");
    } catch (err) {
      console.error("Login failed:", err);
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 2: VERIFY 2FA CODE ───────────────────────────────
  const handleVerify2FA = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const code = formData.get("verification-code") as string;

    try {
      const result = await verify2FA(pendingEmail, code);

      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));

      navigate("/dashboard");
    } catch (err) {
      console.error("2FA failed:", err);
      setError("Invalid or expired verification code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background px-4">

      {/* LOGO + GLOW */}
      <div className="relative mb-6">
        <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-full"></div>
        <img
          src="/transitlens-logo.png"
          alt="TransitLens"
          className="relative h-40 w-auto mx-auto"
        />
      </div>

      {/* TITLE */}
      <h1 className="text-4xl font-bold tracking-tight text-foreground">
        Transit<span className="text-primary">Lens</span>
      </h1>

      {/* TAGLINE */}
      <p className="text-sm tracking-widest text-muted-foreground uppercase mb-6">
        AR Maintenance System
      </p>

      {/* DESCRIPTION */}
      <p className="text-center max-w-md text-muted-foreground mb-8">
        Monitor fleet health, assist technicians with AR diagnostics, and manage maintenance workflows in real time.
      </p>

      {/* LOGIN CARD */}
      <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm">

        <div className="mb-6 text-center">
          <h2 className="text-xl font-semibold">
            {requires2FA ? "Verify your identity" : "Sign in"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {requires2FA
              ? "Enter the 6-digit verification code sent to your email."
              : "Access your TransitLens dashboard"}
          </p>
        </div>

        {/* ── LOGIN FORM ───────────────────────────────────── */}
        {!requires2FA ? (
          <form onSubmit={handleLogin} className="space-y-4">

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter email"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>

              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  className="pr-10"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            <div className="flex items-center justify-between text-sm h-5">
              <p
                className={`font-medium transition-opacity ${
                  error ? "text-red-500 opacity-100" : "opacity-0"
                }`}
              >
                {error || "\u00A0"}
              </p>

              <button
                type="button"
                className="text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Checking..." : "Continue"}
            </Button>

          </form>
        ) : (

          /* ── 2FA FORM ───────────────────────────────────── */
          <form key="two-factor-form" onSubmit={handleVerify2FA} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  key="verification-code-input"
                  id="verification-code"
                  name="verification-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  autoComplete="off"
                  defaultValue=""
                  
                />
            </div>

            <p className="text-xs text-muted-foreground">
              Prototype mode: check backend terminal for your code.
            </p>

            <p
              className={`text-sm font-medium transition-opacity ${
                error ? "text-red-500 opacity-100" : "opacity-0"
              }`}
            >
              {error || "\u00A0"}
            </p>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Verifying..." : "Verify and log in"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setRequires2FA(false);
                setPendingEmail("");
                setError("");
              }}
            >
              Back to login
            </Button>

          </form>
        )}

        {/* Footer */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Secure access for authorised depot maintenance staff only.
        </p>

      </div>
    </div>
  );
};

export default Login;