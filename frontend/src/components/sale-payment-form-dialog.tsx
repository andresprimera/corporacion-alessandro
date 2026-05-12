import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useForm, Controller } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  submitPaymentSchema,
  type SubmitPaymentInput,
  type Sale,
} from "@base-dashboard/shared"
import { submitSalePaymentApi } from "@/lib/sales"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]
const MAX_BYTES = 5 * 1024 * 1024

const EMPTY_VALUES: SubmitPaymentInput = {
  bank: "",
  paymentType: "pago_movil",
  paymentNumber: "",
  paymentDate: "",
  paidAmount: 0,
}

export function SalePaymentFormDialog({
  sale,
  onClose,
}: {
  sale: Sale | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<SubmitPaymentInput>({
    resolver: standardSchemaResolver(submitPaymentSchema),
    defaultValues: EMPTY_VALUES,
  })

  useEffect(() => {
    if (sale) {
      reset({ ...EMPTY_VALUES, paidAmount: sale.totalAmount })
      setFile(null)
      setFileError(null)
    }
  }, [sale, reset])

  const mutation = useMutation({
    mutationFn: (values: SubmitPaymentInput) => {
      if (!sale || !file) throw new Error("Missing file")
      return submitSalePaymentApi(sale.id, {
        image: file,
        bank: values.bank,
        paymentType: values.paymentType,
        paymentNumber: values.paymentNumber,
        paymentDate: values.paymentDate,
        paidAmount: values.paidAmount,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] })
      toast.success(t("Payment submitted"))
      onClose()
    },
    onError: (err: Error) => {
      toast.error(t(err.message) || t("Failed to submit payment"))
    },
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0] ?? null
    setFile(next)
    if (!next) {
      setFileError(null)
      return
    }
    if (!ACCEPTED_TYPES.includes(next.type)) {
      setFileError(t("File must be a JPG, PNG, WebP, or PDF"))
      return
    }
    if (next.size > MAX_BYTES) {
      setFileError(t("File must be smaller than 5 MB"))
      return
    }
    setFileError(null)
  }

  function onSubmit(values: SubmitPaymentInput) {
    if (!file) {
      setFileError(t("File is required"))
      return
    }
    if (fileError) return
    mutation.mutate(values)
  }

  const isResubmit = sale?.status === "payment_rejected"

  return (
    <Dialog
      open={sale !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isResubmit
              ? t("Resubmit payment for sale {{number}}", {
                  number: sale?.saleNumber ?? "",
                })
              : t("Submit payment for sale {{number}}", {
                  number: sale?.saleNumber ?? "",
                })}
          </DialogTitle>
          <DialogDescription>{t("Upload payment proof")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="payment-image">{t("Image")}</FieldLabel>
              <Input
                id="payment-image"
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                onChange={handleFileChange}
              />
              {fileError && (
                <FieldDescription className="text-destructive">
                  {fileError}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="payment-bank">{t("Bank")}</FieldLabel>
              <Input id="payment-bank" type="text" {...register("bank")} />
              {errors.bank && (
                <FieldDescription className="text-destructive">
                  {t(errors.bank.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel>{t("Payment type")}</FieldLabel>
              <Controller
                name="paymentType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("Select a payment type")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pago_movil">
                        {t("Pago Móvil")}
                      </SelectItem>
                      <SelectItem value="bank_transfer">
                        {t("Bank transfer")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.paymentType && (
                <FieldDescription className="text-destructive">
                  {t(errors.paymentType.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="payment-number">
                {t("Payment number")}
              </FieldLabel>
              <Input
                id="payment-number"
                type="text"
                {...register("paymentNumber")}
              />
              {errors.paymentNumber && (
                <FieldDescription className="text-destructive">
                  {t(errors.paymentNumber.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="payment-date">
                {t("Payment date")}
              </FieldLabel>
              <Input
                id="payment-date"
                type="date"
                {...register("paymentDate")}
              />
              {errors.paymentDate && (
                <FieldDescription className="text-destructive">
                  {t(errors.paymentDate.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="payment-paid-amount">
                {t("Paid amount")}
              </FieldLabel>
              <Input
                id="payment-paid-amount"
                type="number"
                step="0.01"
                min="0"
                {...register("paidAmount", { valueAsNumber: true })}
              />
              <FieldDescription>
                {t("Sale total")}:{" "}
                {sale
                  ? new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: sale.currency,
                    }).format(sale.totalAmount)
                  : ""}
              </FieldDescription>
              {errors.paidAmount && (
                <FieldDescription className="text-destructive">
                  {t(errors.paidAmount.message ?? "")}
                </FieldDescription>
              )}
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? t("Submitting payment...")
                : t("Submit payment")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
