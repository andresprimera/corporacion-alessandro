import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"
import { fetchDispatchSummaryApi } from "@/lib/sales"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { AlertCircleIcon } from "lucide-react"

export function SalesDispatchSummaryDialog({
  open,
  onOpenChange,
  soldByUserId,
  salesPersonName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  soldByUserId: string | null
  salesPersonName?: string
}) {
  const { t } = useTranslation()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["sales", "dispatch-summary", soldByUserId],
    queryFn: () => fetchDispatchSummaryApi(soldByUserId!),
    enabled: open && soldByUserId !== null,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("Dispatch summary")}</DialogTitle>
          <DialogDescription>
            {salesPersonName
              ? t(
                  "Product totals across non-delivered sales for {{name}}.",
                  { name: salesPersonName },
                )
              : t("Product totals across non-delivered sales.")}
          </DialogDescription>
        </DialogHeader>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}
        {isError && (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <AlertCircleIcon className="size-8 text-destructive" />
            <p className="text-sm text-muted-foreground">
              {t("Failed to load dispatch summary.")}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t("Try again")}
            </Button>
          </div>
        )}
        {data && data.items.length === 0 && (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            {t("No products pending dispatch.")}
          </div>
        )}
        {data && data.items.length > 0 && (
          <div className="space-y-2">
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Product")}</TableHead>
                    <TableHead className="text-right">
                      {t("Quantity")}
                    </TableHead>
                    <TableHead>{t("Unit")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((item) => (
                    <TableRow
                      key={`${item.productId}-${item.unitId ?? "base"}`}
                    >
                      <TableCell className="font-medium">
                        {item.productName}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.totalQty}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.unitAbbreviation ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("Across {{count}} non-delivered sale", {
                count: data.saleCount,
              })}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
