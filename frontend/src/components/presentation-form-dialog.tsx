import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useForm } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createPresentationSchema,
  type CreatePresentationInput,
  type Presentation,
} from "@base-dashboard/shared"
import {
  createPresentationApi,
  updatePresentationApi,
} from "@/lib/presentations"
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

const defaultValues: CreatePresentationInput = {
  name: "",
  abbreviation: "",
}

function presentationToFormValues(
  presentation: Presentation,
): CreatePresentationInput {
  return {
    name: presentation.name,
    abbreviation: presentation.abbreviation,
  }
}

export function PresentationFormDialog({
  open,
  onOpenChange,
  presentation,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  presentation?: Presentation
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isEdit = presentation !== undefined

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreatePresentationInput>({
    resolver: standardSchemaResolver(createPresentationSchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      reset(
        presentation ? presentationToFormValues(presentation) : defaultValues,
      )
    }
  }, [open, presentation, reset])

  const mutation = useMutation({
    mutationFn: (values: CreatePresentationInput) =>
      isEdit
        ? updatePresentationApi(presentation.id, values)
        : createPresentationApi(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presentations"] })
      toast.success(
        isEdit ? t("Presentation updated") : t("Presentation created"),
      )
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(
        t(error.message) ||
          (isEdit
            ? t("Failed to update presentation")
            : t("Failed to create presentation")),
      )
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("Edit Presentation") : t("Add Presentation")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("Update presentation details")
              : t("Create a new presentation")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="presentation-name">{t("Name")}</FieldLabel>
              <Input
                id="presentation-name"
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
              <FieldLabel htmlFor="presentation-abbreviation">
                {t("Abbreviation")}
              </FieldLabel>
              <Input
                id="presentation-abbreviation"
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
                  ? t("Update Presentation")
                  : t("Create Presentation")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
