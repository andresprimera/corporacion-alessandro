import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"
import { i18n } from "@/lib/i18n"
import type { Sale } from "@base-dashboard/shared"
import { downloadPaymentProofApi } from "@/lib/sales"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircleIcon } from "lucide-react"

export function SalePaymentDetailDialog({
  sale,
  onClose,
}: {
  sale: Sale | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ["payment-proof", sale?.id],
    queryFn: () => downloadPaymentProofApi(sale!.id),
    enabled: sale !== null && sale.paymentProof !== undefined,
  })

  useEffect(() => {
    if (!data) {
      setBlobUrl(null)
      return
    }
    const url = URL.createObjectURL(data.blob)
    setBlobUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [data])

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language)
  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language)

  const proof = sale?.paymentProof
  const isPdf = data?.mimeType === "application/pdf"

  return (
    <Dialog
      open={sale !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("Payment proof")}</DialogTitle>
          <DialogDescription>
            {sale?.saleNumber} · {sale?.clientName}
          </DialogDescription>
        </DialogHeader>
        {proof && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">{t("Bank")}</div>
                <div>{proof.bank}</div>
              </div>
              <div>
                <div className="text-muted-foreground">{t("Payment type")}</div>
                <div>
                  {proof.paymentType === "pago_movil"
                    ? t("Pago Móvil")
                    : t("Bank transfer")}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">
                  {t("Payment number")}
                </div>
                <div>{proof.paymentNumber}</div>
              </div>
              <div>
                <div className="text-muted-foreground">
                  {t("Payment date")}
                </div>
                <div>{formatDate(proof.paymentDate)}</div>
              </div>
              <div className="col-span-2">
                <div className="text-muted-foreground">
                  {t("Submitted at")}
                </div>
                <div>{formatDateTime(proof.submittedAt)}</div>
              </div>
            </div>
            {isLoading && <Skeleton className="h-64 w-full" />}
            {isError && (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircleIcon className="size-4" />
                {t("Failed to load payment proof")}
              </div>
            )}
            {blobUrl && !isPdf && (
              <img
                src={blobUrl}
                alt={t("Payment proof")}
                className="max-h-[60vh] w-full rounded-md border object-contain"
              />
            )}
            {blobUrl && isPdf && (
              <embed
                src={blobUrl}
                type="application/pdf"
                className="h-[60vh] w-full rounded-md border"
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
