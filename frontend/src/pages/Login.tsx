import { useState, FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginUser } from "@/lib/api";

const Login = () => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await loginUser(email, password);

      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));

      navigate("/dashboard");
    } catch (err) {
      console.error("Login failed:", err);
      setError("Invalid username or password");
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
          <h2 className="text-xl font-semibold">Sign in</h2>
          <p className="text-sm text-muted-foreground">
            Access your TransitLens dashboard
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              placeholder="Enter email"
            />
          </div>

          {/* Password with toggle */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>

            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
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

          <div className="flex items-center justify-between text-sm h-5">
  
          {/* Error (left) */}
          <p
            className={`font-medium transition-opacity ${
              error ? "text-red-500 opacity-100" : "opacity-0"
            }`}
          >
            {error || "\u00A0"}
          </p>

          {/* Forgot password (right) */}
          <button
            type="button"
            className="text-primary hover:underline"
          >
            Forgot password?
          </button>

        </div>

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logging in..." : "Log in"}
          </Button>

        </form>

        {/* Security note */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Secure access for authorised depot maintenance staff only.
        </p>

      </div>
    </div>
  );
};

export default Login;