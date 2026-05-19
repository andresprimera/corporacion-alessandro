import { useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useForm } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createExchangeRateSchema,
  type CreateExchangeRateInput,
} from "@base-dashboard/shared"
import { createExchangeRateApi } from "@/lib/exchange-rates"
import { ApiError } from "@/lib/api-error"
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
import { Button } from "@/components/ui/button"

function todayLocalISODate(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function ExchangeRateFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const today = useMemo(() => todayLocalISODate(), [])

  const defaultValues: CreateExchangeRateInput = {
    rateDate: today,
    value: 0,
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateExchangeRateInput>({
    resolver: standardSchemaResolver(createExchangeRateSchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      reset(defaultValues)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, today, reset])

  const mutation = useMutation({
    mutationFn: (values: CreateExchangeRateInput) =>
      createExchangeRateApi(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exchange-rates"] })
      toast.success(t("Exchange rate added"))
      onOpenChange(false)
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.statusCode === 409) {
        toast.error(t("A rate already exists for that date"))
        return
      }
      toast.error(t(error.message) || t("Failed to add exchange rate"))
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Add exchange rate")}</DialogTitle>
          <DialogDescription>
            {t("Record the official rate for today.")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="exchange-rate-date">{t("Date")}</FieldLabel>
              <Input
                id="exchange-rate-date"
                type="date"
                min={today}
                {...register("rateDate")}
              />
              {errors.rateDate && (
                <FieldDescription className="text-destructive">
                  {t(errors.rateDate.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="exchange-rate-value">
                {t("Rate (Bs./USD)")}
              </FieldLabel>
              <Input
                id="exchange-rate-value"
                type="number"
                step="0.0001"
                min="0"
                {...register("value", { valueAsNumber: true })}
              />
              {errors.value && (
                <FieldDescription className="text-destructive">
                  {t(errors.value.message ?? "")}
                </FieldDescription>
              )}
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t("Saving...") : t("Save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
