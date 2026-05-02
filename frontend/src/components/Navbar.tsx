import { NavLink, useNavigate } from "react-router-dom";
import { AccessibilityToggle } from "@/components/AccessibilityToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { User } from "lucide-react";

export function Navbar() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm font-medium ${
      isActive
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  return (
    <header className="border-b bg-card sticky top-0 z-10">
      <div className="container max-w-6xl flex items-center px-4 py-4">

        {/* LEFT: Logo + Branding */}
        <div className="flex items-center gap-3">
          <img
            src="/transitlens-logo.png"
            alt="TransitLens logo"
            className="h-12 w-12 rounded-lg object-contain"
          />

          <div className="leading-tight">
            <h1 className="text-lg font-bold text-foreground">
              Transit<span className="text-primary">Lens</span>
            </h1>

            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              AR Maintenance System
            </p>
          </div>
        </div>

        {/* CENTER: Navigation */}
        <nav className="flex items-center gap-2 mx-auto">
          <NavLink to="/dashboard" className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/summary" className={linkClass}>
            Summary
          </NavLink>
          <NavLink to="/ar" className={linkClass}>
            AR Mode
          </NavLink>
          <NavLink to="/tool-tracker" className={linkClass}>
            Tool Tracker
          </NavLink>
          <NavLink to="/maintenance-reports" className={linkClass}>
            Maintenance Reports
          </NavLink>
        </nav>

        {/* RIGHT: Account Menu */}
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-9 w-9 items-center justify-center rounded-full bg-muted hover:bg-muted/80">
                <User className="h-5 w-5 text-foreground" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">

              {/* 👤 User Info */}
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-foreground">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.role || "Technician"}
                </p>
              </div>

              <DropdownMenuSeparator />

              {/* 📋 Navigation Section */}
              <div className="px-3 py-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Navigation
                </p>
              </div>

              <DropdownMenuItem onClick={() => navigate("/team")}>
                Team
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate("/jobs")}>
                My Jobs
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate("/maintenance-reports")}>
                Reports
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate("/notifications")}>
                Notifications
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* ♿ Accessibility Section */}
              <div className="px-3 py-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Accessibility
                </p>
              </div>

              <div className="px-3 py-2">
                <AccessibilityToggle />
              </div>

              <DropdownMenuSeparator />

              {/* ⚙️ Account Section */}
              <div className="px-3 py-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Account
                </p>
              </div>

              <DropdownMenuItem onClick={() => navigate("/settings")}>
                Settings
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-500 focus:text-red-500"
              >
                Logout
              </DropdownMenuItem>

            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>
    </header>
  );
}