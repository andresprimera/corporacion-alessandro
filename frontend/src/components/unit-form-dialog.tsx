import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useForm } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createUnitSchema,
  type CreateUnitInput,
  type Unit,
} from "@base-dashboard/shared"
import { createUnitApi, updateUnitApi } from "@/lib/units"
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

const defaultValues: CreateUnitInput = {
  name: "",
  abbreviation: "",
}

function unitToFormValues(unit: Unit): CreateUnitInput {
  return {
    name: unit.name,
    abbreviation: unit.abbreviation,
  }
}

export function UnitFormDialog({
  open,
  onOpenChange,
  unit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  unit?: Unit
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isEdit = unit !== undefined

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateUnitInput>({
    resolver: standardSchemaResolver(createUnitSchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      reset(unit ? unitToFormValues(unit) : defaultValues)
    }
  }, [open, unit, reset])

  const mutation = useMutation({
    mutationFn: (values: CreateUnitInput) =>
      isEdit ? updateUnitApi(unit.id, values) : createUnitApi(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] })
      toast.success(isEdit ? t("Unit updated") : t("Unit created"))
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(
        t(error.message) ||
          (isEdit ? t("Failed to update unit") : t("Failed to create unit")),
      )
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("Edit Unit") : t("Add Unit")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("Update unit details") : t("Create a new unit")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="unit-name">{t("Name")}</FieldLabel>
              <Input id="unit-name" type="text" {...register("name")} />
              {errors.name && (
                <FieldDescription className="text-destructive">
                  {t(errors.name.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="unit-abbreviation">
                {t("Abbreviation")}
              </FieldLabel>
              <Input
                id="unit-abbreviation"
                type="text"
                maxLength={10}
                {...register("abbreviation")}
              />
              {errors.abbreviation && (
                <FieldDescription className="text-destructive">
                  {t(errors.abbreviation.message ?? "")}
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
              {mutation.isPending
                ? isEdit
                  ? t("Updating...")
                  : t("Creating...")
                : isEdit
                  ? t("Update Unit")
                  : t("Create Unit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
