import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useForm } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createLiquorTypeSchema,
  type CreateLiquorTypeInput,
  type LiquorType,
} from "@base-dashboard/shared"
import {
  createLiquorTypeApi,
  updateLiquorTypeApi,
} from "@/lib/liquor-types"
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

const defaultValues: CreateLiquorTypeInput = {
  name: "",
  abbreviation: "",
}

function liquorTypeToFormValues(
  liquorType: LiquorType,
): CreateLiquorTypeInput {
  return {
    name: liquorType.name,
    abbreviation: liquorType.abbreviation,
  }
}

export function LiquorTypeFormDialog({
  open,
  onOpenChange,
  liquorType,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  liquorType?: LiquorType
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isEdit = liquorType !== undefined

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateLiquorTypeInput>({
    resolver: standardSchemaResolver(createLiquorTypeSchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      reset(liquorType ? liquorTypeToFormValues(liquorType) : defaultValues)
    }
  }, [open, liquorType, reset])

  const mutation = useMutation({
    mutationFn: (values: CreateLiquorTypeInput) =>
      isEdit
        ? updateLiquorTypeApi(liquorType.id, values)
        : createLiquorTypeApi(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["liquor-types"] })
      toast.success(
        isEdit ? t("Liquor type updated") : t("Liquor type created"),
      )
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(
        t(error.message) ||
          (isEdit
            ? t("Failed to update liquor type")
            : t("Failed to create liquor type")),
      )
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("Edit Liquor Type") : t("Add Liquor Type")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("Update liquor type details")
              : t("Create a new liquor type")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="liquor-type-name">{t("Name")}</FieldLabel>
              <Input
                id="liquor-type-name"
                type="text"
                {...register("name")}
              />
              {errors.name && (
                <FieldDescription className="text-destructive">
                  {t(errors.name.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="liquor-type-abbreviation">
                {t("Abbreviation")}
              </FieldLabel>
              <Input
                id="liquor-type-abbreviation"
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
                  ? t("Update Liquor Type")
                  : t("Create Liquor Type")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
