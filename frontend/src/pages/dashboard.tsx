import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import data from "@/data.json"

export default function DashboardPage() {
  return (
    <>
      <SectionCards />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartAreaInteractive />
        <DataTable data={data} />
      </div>
    </>
  )
}
