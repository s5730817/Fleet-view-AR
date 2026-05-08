import fs from "fs";
import type { ServerOptions as HttpsServerOptions } from "https";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const useHttps = env.VITE_DEV_HTTPS === "1";

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

  const certPair = certCandidates.find(({ key, cert }) => fs.existsSync(key) && fs.existsSync(cert));

  const httpsOptions: boolean | HttpsServerOptions = useHttps
    ? certPair
      ? { key: fs.readFileSync(certPair.key), cert: fs.readFileSync(certPair.cert) }
      : true
    : false;



  return {
    server: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: true,
      https: httpsOptions,
      hmr: {
        protocol: useHttps ? "wss" : "ws",
        overlay: false,
      },
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
        }
      }
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});