import { useTheme, THEME_OPTIONS } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Palette, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeSwitcher() {
  const { theme, setTheme, isDark, toggleDark } = useTheme();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          <Palette className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-3" align="end">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Theme</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleDark}>
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors hover:bg-accent",
                theme === opt.value && "border-primary bg-accent"
              )}
            >
              <div
                className="h-5 w-5 rounded-full border"
                style={{ backgroundColor: opt.preview }}
              />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
