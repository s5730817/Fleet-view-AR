import { Moon, Sun, Eye } from "lucide-react";
import { useAccessibility } from "@/context/AccessibilityContext";

export const AccessibilityToggle = () => {
    const { darkMode, setDarkMode, colorBlind, setColorBlind } = useAccessibility();

    return (
        <div className="flex items-center gap-2">
            {/* Dark Mode Toggle */}
            <button
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                onClick={() => setDarkMode(!darkMode)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors
          ${darkMode
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border hover:bg-accent"
                }`}
            >
                {darkMode ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{darkMode ? "Dark" : "Light"}</span>
            </button>

            {/* Colorblind Mode Toggle */}
            <button
                aria-label={colorBlind ? "Disable colorblind mode" : "Enable colorblind mode"}
                title={colorBlind ? "Disable colorblind mode" : "Enable colorblind mode"}
                onClick={() => setColorBlind(!colorBlind)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors
          ${colorBlind
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border hover:bg-accent"
                }`}
            >
                <Eye className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{colorBlind ? "CB: On" : "CB: Off"}</span>
            </button>
        </div>
    );
};