import { FileCode, Star } from "lucide-react";
import { DiscoveredScript } from "@/lib/discovery";

interface ScriptPickerProps {
  candidates: DiscoveredScript[];
  selectedScript: string;
  onSelectScript: (scriptPath: string) => void;
  shebang?: string | null;
  totalLines?: number;
}

export function ScriptPicker({
  candidates,
  selectedScript,
  onSelectScript,
  shebang,
  totalLines,
}: ScriptPickerProps) {
  if (candidates.length <= 1 && !selectedScript) {
    return null;
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Detected Installer & Bootstrap Scripts ({candidates.length})
        </label>
        <span className="text-[11px] font-mono text-zinc-500">Select script to inspect</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {candidates.map((cand) => {
          const isSelected = cand.path === selectedScript;
          return (
            <button
              key={cand.path}
              type="button"
              onClick={() => onSelectScript(cand.path)}
              className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                isSelected
                  ? "border-blue-500 bg-blue-500/5 dark:bg-blue-500/10 shadow-sm"
                  : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
              }`}
            >
              <div className="flex items-start justify-between gap-2 w-full">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCode
                    className={`h-4 w-4 shrink-0 ${isSelected ? "text-blue-500" : "text-zinc-400"}`}
                  />
                  <span
                    className={`font-mono text-xs font-medium truncate ${
                      isSelected ? "text-foreground font-bold" : "text-foreground/90"
                    }`}
                  >
                    {cand.path}
                  </span>
                </div>
                {cand.isPrimaryCandidate && (
                  <span
                    className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20"
                    title="High-confidence installer entrypoint"
                  >
                    <Star className="h-2.5 w-2.5 fill-amber-500" />
                    Primary
                  </span>
                )}
              </div>

              <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] font-mono text-zinc-500 w-full">
                <span>{isSelected && totalLines ? `${totalLines} lines` : "Shell script"}</span>
                <span className="truncate max-w-[140px] text-zinc-400">
                  {isSelected && shebang ? shebang : cand.size ? `${Math.round(cand.size / 1024)} KB` : ".sh"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
