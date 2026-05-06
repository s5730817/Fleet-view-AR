import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const shouldRegisterServiceWorker =
	"serviceWorker" in navigator &&
	(
		import.meta.env.PROD
		|| window.isSecureContext
		|| window.location.hostname === "localhost"
		|| window.location.hostname === "127.0.0.1"
	);

if (shouldRegisterServiceWorker) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("/sw.js").catch((error) => {
			const message = error instanceof Error ? error.message : String(error);
			if (message.toLowerCase().includes("ssl certificate")) {
				console.error(
					"Service worker registration failed because the local HTTPS certificate is not trusted. For offline/PWA testing, use http://localhost, http://127.0.0.1, or trust the local certificate first.",
					error,
				);
				return;
			}

			console.error("Service worker registration failed", error);
		});
	});
}

createRoot(document.getElementById("root")!).render(<App />);