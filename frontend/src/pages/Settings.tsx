import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccessibilityToggle } from "@/components/AccessibilityToggle";

import {
  User,
  Settings as SettingsIcon,
  Bell,
  Shield,
  LogOut,
  Mail,
  Phone,
  Building2,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

const depotOptions = [
  "Depot 1",
  "Depot 2",
  "Depot 3",
  "Depot 4",
  "Depot 5",
  "Depot 6",
];

const Settings = () => {
  const navigate = useNavigate();

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const storedSettings = JSON.parse(localStorage.getItem("settings") || "{}");

  const [name, setName] = useState(storedUser?.name || "TransitLens User");
  const [role] = useState(storedUser?.role || "Technician");
  const [email, setEmail] = useState(storedUser?.email || "technician@transitlens.co.uk");
  const [phone, setPhone] = useState(storedUser?.phone || "07123 456789");
  const [depot, setDepot] = useState(storedUser?.depot || "Depot 1");

  const [faultAlerts, setFaultAlerts] = useState(
    storedSettings?.faultAlerts ?? true
  );
  const [maintenanceUpdates, setMaintenanceUpdates] = useState(
    storedSettings?.maintenanceUpdates ?? true
  );
  const [overdueAlerts, setOverdueAlerts] = useState(
    storedSettings?.overdueAlerts ?? true
  );

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleSaveProfile = () => {
    const updatedUser = {
      ...storedUser,
      name,
      role,
      email,
      phone,
      depot,
    };

    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  const handleSaveNotifications = () => {
    localStorage.setItem(
      "settings",
      JSON.stringify({
        ...storedSettings,
        faultAlerts,
        maintenanceUpdates,
        overdueAlerts,
      })
    );
  };

  const handleChangePassword = () => {
    console.log("Password change requested", {
      currentPassword,
      newPassword,
    });

    setCurrentPassword("");
    setNewPassword("");
    setShowPasswordSection(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <main className="container max-w-6xl px-4 py-6 space-y-6">

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile Details
          </CardTitle>
        </CardHeader>

        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm text-muted-foreground">Full Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Role</label>
            <Input value={role} disabled />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              Email Address
            </label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              Phone Number
            </label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              Assigned Depot
            </label>

            <select
              value={depot}
              onChange={(e) => setDepot(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              {depotOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button onClick={handleSaveProfile}>Save Profile</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notification Preferences
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <SettingToggle
            title="Fault reported alerts"
            description="Receive notifications when a new vehicle fault is reported."
            enabled={faultAlerts}
            onToggle={() => setFaultAlerts((prev) => !prev)}
          />

          <SettingToggle
            title="Maintenance completed updates"
            description="Receive updates when assigned maintenance work is completed."
            enabled={maintenanceUpdates}
            onToggle={() => setMaintenanceUpdates((prev) => !prev)}
          />

          <SettingToggle
            title="Overdue job warnings"
            description="Receive warnings when maintenance tasks pass their due date."
            enabled={overdueAlerts}
            onToggle={() => setOverdueAlerts((prev) => !prev)}
          />

          <Button onClick={handleSaveNotifications}>
            Save Notification Preferences
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Account & Security
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border bg-background p-4">
            <div>
              <p className="font-medium text-foreground">Change Password</p>
              <p className="text-sm text-muted-foreground">
                Update your account password.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => setShowPasswordSection((prev) => !prev)}
            >
              <Lock className="h-4 w-4 mr-2" />
              {showPasswordSection ? "Hide" : "Change"}
            </Button>
          </div>

          {showPasswordSection && (
            <div className="grid gap-4 rounded-lg border bg-background p-4 md:grid-cols-2">
              <div>
                <label className="text-sm text-muted-foreground">
                  Current Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-muted-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">
                  New Password
                </label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <Button onClick={handleChangePassword}>Update Password</Button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border bg-background p-4">
            <div>
              <p className="font-medium text-foreground">Accessibility Mode</p>
              <p className="text-sm text-muted-foreground">
                Adjust the interface for improved accessibility.
              </p>
            </div>

            <AccessibilityToggle />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <InfoRow label="App Version" value="1.0.0" />
          <InfoRow label="Data Sync" value="Up to date" valueClassName="text-green-500" />
          <InfoRow label="Account Status" value="Active" valueClassName="text-green-500" />
          <InfoRow label="Permission Level" value={role} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="font-medium text-foreground">Sign out</p>
            <p className="text-sm text-muted-foreground">
              End your current session on this device.
            </p>
          </div>

          <Button
            variant="destructive"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};

const SettingToggle = ({
  title,
  description,
  enabled,
  onToggle,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) => {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-background p-4">
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className={`relative flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          enabled ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`absolute h-4 w-4 rounded-full bg-background transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
};

const InfoRow = ({
  label,
  value,
  valueClassName = "text-foreground",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) => {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-muted-foreground">{label}</p>
      <p className={`font-medium ${valueClassName}`}>{value}</p>
    </div>
  );
};

export default Settings;