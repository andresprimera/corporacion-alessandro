import { useEffect, useState, type ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { Sale } from "@base-dashboard/shared"
import { updateSaleApi } from "@/lib/sales"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { toast } from "sonner"

export function SaleNotesDialog({
  sale,
  onClose,
}: {
  sale: Sale | null
  onClose: () => void
}): ReactElement {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [notes, setNotes] = useState("")

  useEffect(() => {
    setNotes(sale?.notes ?? "")
  }, [sale])

  const mutation = useMutation({
    mutationFn: (next: string) => {
      if (!sale) throw new Error("No sale selected")
      return updateSaleApi(sale.id, { notes: next.trim() || undefined })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] })
      toast.success(t("Sale updated"))
      onClose()
    },
    onError: (err: Error) => {
      toast.error(t(err.message) || t("Failed to update sale"))
    },
  })

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    if (!sale) return
    mutation.mutate(notes)
  }

  return (
    <Dialog
      open={sale !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Edit sale notes")}</DialogTitle>
          <DialogDescription>
            {sale ? t("Sale {{number}}", { number: sale.saleNumber }) : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="sale-edit-notes">{t("Notes")}</FieldLabel>
              <Input
                id="sale-edit-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t("Saving...") : t("Save Changes")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
