import { GlobeIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { supportedLocales } from "@/lib/i18n"

const localeLabels: Record<string, string> = {
  en: "English",
  es: "Español",
}

export function LanguageToggle() {
  const { i18n, t } = useTranslation()

  if (supportedLocales.length <= 1) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" />}
      >
        <GlobeIcon className="size-4" />
        <span className="sr-only">{t("Change language")}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {supportedLocales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => i18n.changeLanguage(locale)}
          >
            {localeLabels[locale] ?? locale}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
