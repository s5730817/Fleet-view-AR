import fs from "fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const certCandidates = [
  {
    key: path.resolve(__dirname, "./certs/dev.key"),
    cert: path.resolve(__dirname, "./certs/dev.crt"),
  },
  {
    key: path.resolve(__dirname, "./cert.key"),
    cert: path.resolve(__dirname, "./cert.crt"),
  },
  {
    key: path.resolve(__dirname, "../myAR/certs/localhost-key.pem"),
    cert: path.resolve(__dirname, "../myAR/certs/localhost.pem"),
  },
  {
    key: path.resolve(__dirname, "../myAR/certs/cert.key"),
    cert: path.resolve(__dirname, "../myAR/certs/cert.crt"),
  },
];

const useHttps = process.env.VITE_DEV_HTTPS === "1";
const certPair = certCandidates.find(({ key, cert }) => fs.existsSync(key) && fs.existsSync(cert));

const httpsOptions = useHttps
  ? certPair
    ? {
        key: fs.readFileSync(certPair.key),
        cert: fs.readFileSync(certPair.cert),
      }
    : true
  : false;

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
    https: httpsOptions,
    hmr: {
      protocol: "ws",
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
