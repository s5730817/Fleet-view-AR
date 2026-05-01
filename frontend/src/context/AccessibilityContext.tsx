import { createContext, useContext, useEffect, useState } from "react";

interface AccessibilityContextType {
    darkMode: boolean;
    setDarkMode: (val: boolean) => void;
    colorBlind: boolean;
    setColorBlind: (val: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType>({
    darkMode: false,
    setDarkMode: () => {},
    colorBlind: false,
    setColorBlind: () => {},
});

export const AccessibilityProvider = ({ children }: { children: React.ReactNode }) => {
    const [darkMode, setDarkModeState] = useState<boolean>(() => {
        return localStorage.getItem("darkMode") === "true";
    });
    const [colorBlind, setColorBlindState] = useState<boolean>(() => {
        return localStorage.getItem("colorBlind") === "true";
    });

    const setDarkMode = (val: boolean) => {
        setDarkModeState(val);
        localStorage.setItem("darkMode", String(val));
    };

    const setColorBlind = (val: boolean) => {
        setColorBlindState(val);
        localStorage.setItem("colorBlind", String(val));
    };

    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle("dark", darkMode);
        root.classList.toggle("colorblind", colorBlind);
    }, [darkMode, colorBlind]);

    return (
        <AccessibilityContext.Provider value={{ darkMode, setDarkMode, colorBlind, setColorBlind }}>
            {children}
        </AccessibilityContext.Provider>
    );
};

export const useAccessibility = () => useContext(AccessibilityContext);