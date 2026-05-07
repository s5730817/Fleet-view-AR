import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, ExternalLink, ShieldCheck, Smartphone, Wifi } from "lucide-react";

const defaultHost =
  typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? window.location.hostname
    : "";

const buildLinks = (host: string, frontendPort: string, backendPort: string) => {
  const cleanHost = host.trim();

  return {
    appUrl: cleanHost ? `https://${cleanHost}:${frontendPort}` : "",
    certUrl: cleanHost ? `http://${cleanHost}:${backendPort}/api/auth/device-ca` : "",
  };
};

const copyText = async (value: string) => {
  await navigator.clipboard.writeText(value);
};

const DeviceSetup = () => {
  const { toast } = useToast();
  const [host, setHost] = useState(defaultHost);
  const [frontendPort, setFrontendPort] = useState("8080");
  const [backendPort, setBackendPort] = useState("5000");

  const links = useMemo(
    () => buildLinks(host, frontendPort, backendPort),
    [host, frontendPort, backendPort]
  );

  const handleCopy = async (label: string, value: string) => {
    if (!value) {
      return;
    }

    await copyText(value);
    toast({
      title: `${label} copied`,
      description: value,
    });
  };

  const handleShare = async () => {
    if (!navigator.share || !links.appUrl || !links.certUrl) {
      return;
    }

    await navigator.share({
      title: "TransitLens device setup",
      text: `1. Download the TransitLens dev CA certificate: ${links.certUrl}\n2. Trust it on the device\n3. Open the app: ${links.appUrl}`,
      url: links.appUrl,
    });
  };

  return (
    <main className="container max-w-5xl px-4 py-6 space-y-6">
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Smartphone className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground">Device Setup</h1>
            <p className="text-sm text-muted-foreground">
              Prototype onboarding for field devices: send the certificate, trust it once, then open the LAN app and cache the offline session.
            </p>
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            LAN Values
          </CardTitle>
        </CardHeader>

        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="device-host">Server IP or hostname</Label>
            <Input
              id="device-host"
              value={host}
              onChange={(event) => setHost(event.target.value)}
              placeholder="192.168.1.25"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="frontend-port">Frontend HTTPS port</Label>
            <Input id="frontend-port" value={frontendPort} onChange={(event) => setFrontendPort(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="backend-port">Backend HTTP port</Label>
            <Input id="backend-port" value={backendPort} onChange={(event) => setBackendPort(event.target.value)} />
          </div>

          <div className="flex items-end">
            {navigator.share ? (
              <Button className="w-full" onClick={() => void handleShare()} disabled={!links.appUrl || !links.certUrl}>
                Share Setup
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Certificate Download
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-background p-4 text-sm">
              <p className="font-medium text-foreground">Download URL</p>
              <p className="mt-2 break-all text-muted-foreground">{links.certUrl || "Enter the LAN IP to generate the certificate link."}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void handleCopy("Certificate URL", links.certUrl)} disabled={!links.certUrl}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </Button>

              <Button asChild disabled={!links.certUrl}>
                <a href={links.certUrl || "#"} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Download
                </a>
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              This downloads the generated local CA from the backend over HTTP so the target device can trust it before opening the HTTPS app.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              App URL
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-background p-4 text-sm">
              <p className="font-medium text-foreground">LAN app URL</p>
              <p className="mt-2 break-all text-muted-foreground">{links.appUrl || "Enter the LAN IP to generate the HTTPS app link."}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void handleCopy("App URL", links.appUrl)} disabled={!links.appUrl}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </Button>

              <Button asChild disabled={!links.appUrl}>
                <a href={links.appUrl || "#"} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open App
                </a>
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              After trusting the certificate, open this URL on the field device, sign in once online, and load the buses you need before disconnecting.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prototype Device Steps</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>1. Make sure the field device is on the same LAN as this machine.</p>
          <p>2. Download the dev CA certificate from the link above.</p>
          <p>3. Trust that certificate in the device settings or browser certificate flow.</p>
          <p>4. Open the HTTPS app URL above.</p>
          <p>5. Log in as `manager` or `tech`, wait for the dashboard to finish loading, then open the buses you need and AR for the buses you want offline.</p>
          <p>6. After that preload step, you can switch Wi-Fi off and keep the offline-safe field workflow.</p>
        </CardContent>
      </Card>
    </main>
  );
};

export default DeviceSetup;