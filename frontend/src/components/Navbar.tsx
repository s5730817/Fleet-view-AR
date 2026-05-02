import { NavLink, useNavigate } from "react-router-dom";
import { AccessibilityToggle } from "@/components/AccessibilityToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Menu, User } from "lucide-react";

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
    <header className="sticky top-0 z-10 border-b bg-card">
      <div className="container max-w-6xl flex items-center gap-3 px-4 py-3">

        {/* LEFT: Logo */}
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/transitlens-logo.png"
            alt="TransitLens logo"
            className="h-10 w-10 shrink-0 rounded-lg object-contain sm:h-12 sm:w-12"
          />

          <div className="min-w-0 leading-tight">
            <h1 className="truncate text-base font-bold text-foreground sm:text-lg">
              Transit<span className="text-primary">Lens</span>
            </h1>

            <p className="hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:block">
              AR Maintenance System
            </p>
          </div>
        </div>

        {/* CENTER: Desktop Navigation */}
        <nav className="mx-auto hidden items-center gap-2 lg:flex">
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

        {/* RIGHT: Mobile Nav + Account */}
        <div className="ml-auto flex items-center gap-2">

          {/* MOBILE NAV (ONLY NAVBAR LINKS) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-9 w-9 items-center justify-center rounded-full bg-muted hover:bg-muted/80 lg:hidden">
                <Menu className="h-5 w-5 text-foreground" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                Dashboard
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate("/summary")}>
                Summary
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate("/ar")}>
                AR Mode
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate("/tool-tracker")}>
                Tool Tracker
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate("/maintenance-reports")}>
                Maintenance Reports
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* ACCOUNT MENU */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-9 w-9 items-center justify-center rounded-full bg-muted hover:bg-muted/80">
                <User className="h-5 w-5 text-foreground" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="truncate text-sm font-medium text-foreground">
                  {user?.name || "User"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.role || "Technician"}
                </p>
              </div>

              <DropdownMenuSeparator />

              {/* Navigation (extra pages not in navbar) */}
              <div className="px-3 py-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Navigation
                </p>
              </div>

              <DropdownMenuItem onClick={() => navigate("/jobs")}>
                My Jobs
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate("/team")}>
                Team
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate("/notifications")}>
                Notifications
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Accessibility */}
              <div className="px-3 py-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Accessibility
                </p>
              </div>

              <div className="px-3 py-2">
                <AccessibilityToggle />
              </div>

              <DropdownMenuSeparator />

              {/* Account */}
              <div className="px-3 py-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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