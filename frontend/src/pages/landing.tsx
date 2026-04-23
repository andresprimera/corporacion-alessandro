import { Button } from "@/components/ui/button"
import { Link } from "react-router"
import { CommandIcon } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <CommandIcon className="size-5" />
          <span className="text-lg font-semibold">Acme Inc.</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" render={<Link to="/login" />}>
            Login
          </Button>
          <Button render={<Link to="/signup" />}>
            Sign Up
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Your Dashboard, Simplified
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          Manage your projects, track analytics, and collaborate with your team
          — all in one place.
        </p>
        <div className="flex gap-3">
          <Button size="lg" render={<Link to="/signup" />}>
            Get Started
          </Button>
          <Button size="lg" variant="outline" render={<Link to="/login" />}>
            Sign In
          </Button>
        </div>
      </main>

      <section className="grid gap-6 px-6 py-12 sm:grid-cols-3 border-t">
        {["Analytics", "Team Management", "Project Tracking"].map(
          (feature) => (
            <div key={feature} className="rounded-lg border p-6 text-center">
              <h3 className="font-semibold">{feature}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore.
              </p>
            </div>
          ),
        )}
      </section>
    </div>
  )
}
