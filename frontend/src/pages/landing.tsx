import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Link } from "react-router"
import { CommandIcon } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"

export default function LandingPage() {
  const { t } = useTranslation()

  const features = [
    { key: "analytics", title: t("Analytics") },
    { key: "team", title: t("Team Management") },
    { key: "projects", title: t("Project Tracking") },
  ]

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <CommandIcon className="size-5" />
          <span className="font-display text-2xl font-semibold italic tracking-wide">
            Alessandro Corp
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <Button variant="ghost" render={<Link to="/login" />}>
            {t("Login")}
          </Button>
          <Button render={<Link to="/signup" />}>
            {t("Sign Up")}
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {t("Your Dashboard, Simplified")}
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          {t("Manage your projects, track analytics, and collaborate with your team — all in one place.")}
        </p>
        <div className="flex gap-3">
          <Button size="lg" render={<Link to="/signup" />}>
            {t("Get Started")}
          </Button>
          <Button size="lg" variant="outline" render={<Link to="/login" />}>
            {t("Sign In")}
          </Button>
        </div>
      </main>

      <section className="grid gap-6 px-6 py-12 sm:grid-cols-3 border-t">
        {features.map((feature) => (
          <div key={feature.key} className="rounded-lg border p-6 text-center">
            <h3 className="font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.")}
            </p>
          </div>
        ))}
      </section>
    </div>
  )
}
