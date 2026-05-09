import { ChevronDown, ChevronUp } from "lucide-react";
import { getMarkerToneColorToken } from "../markerPresentation";

export function ARLegendPanel({ title = "Legend", sections, isOpen, onToggle, className = "" }) {
  return (
    <div className={`pointer-events-auto ar-glass-strong w-full max-w-md min-w-0 rounded-2xl border border-white/15 p-2 text-white shadow-xl backdrop-blur ${className}`.trim()}>
      <button
        type="button"
        onClick={onToggle}
        className="ar-glass-soft flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2 text-left"
      >
        <p className="text-sm font-semibold text-white">{title}</p>
        {isOpen ? <ChevronUp className="h-4 w-4 text-white/75" /> : <ChevronDown className="h-4 w-4 text-white/75" />}
      </button>

      {isOpen && (
        <div className="mt-2 space-y-2">
          {sections.map((section) => (
            <div key={section.title} className="ar-glass-soft rounded-xl border border-white/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{section.title}</p>
              <div className="mt-2 space-y-2">
                {section.items.map((item) => {
                  const { cssVar, fallback } = getMarkerToneColorToken(item.tone);
                  const color = `hsl(var(${cssVar}, ${fallback}))`;

                  return (
                    <div key={`${section.title}-${item.label}`} className="flex min-w-0 items-start gap-2 text-sm text-white/85">
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/30"
                        style={{ backgroundColor: color }}
                      />
                      <span className="w-12 shrink-0 font-semibold text-white">{item.label}</span>
                      <span className="min-w-0 break-words leading-tight text-white/70">{item.description}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}