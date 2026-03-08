import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const isVi = i18n.language === "vi";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => i18n.changeLanguage(isVi ? "en" : "vi")}
      className="gap-1.5 text-xs"
    >
      <Globe className="h-3.5 w-3.5" />
      {isVi ? "EN" : "VI"}
    </Button>
  );
}
