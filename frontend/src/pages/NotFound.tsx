import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm text-center">

        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-foreground mb-2">
          404 - Page Not Found
        </h1>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-6">
          The page you’re looking for doesn’t exist or may have been moved.
        </p>

        {/* Action */}
        <Button
          onClick={() => navigate("/dashboard")}
          className="w-full"
        >
          Go to Dashboard
        </Button>

        {/* Optional path info (helpful for debugging) */}
        <p className="mt-4 text-xs text-muted-foreground">
          Tried to access: <span className="font-mono">{location.pathname}</span>
        </p>
      </div>
    </div>
  );
};

export default NotFound;