import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useForm, Controller } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createCitySchema,
  type CreateCityInput,
  type City,
} from "@base-dashboard/shared"
import { createCityApi, updateCityApi } from "@/lib/cities"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"

const defaultValues: CreateCityInput = {
  name: "",
  isActive: true,
}

function cityToFormValues(city: City): CreateCityInput {
  return {
    name: city.name,
    isActive: city.isActive,
  }
}

export function CityFormDialog({
  open,
  onOpenChange,
  city,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  city?: City
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isEdit = city !== undefined

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<CreateCityInput>({
    resolver: standardSchemaResolver(createCitySchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      reset(city ? cityToFormValues(city) : defaultValues)
    }
  }, [open, city, reset])

  const mutation = useMutation({
    mutationFn: (values: CreateCityInput) =>
      isEdit ? updateCityApi(city.id, values) : createCityApi(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cities"] })
      toast.success(isEdit ? t("City updated") : t("City created"))
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(
        t(error.message) ||
          (isEdit ? t("Failed to update city") : t("Failed to create city")),
      )
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("Edit City") : t("Add City")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("Update city details") : t("Create a new city")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="city-name">{t("Name")}</FieldLabel>
              <Input id="city-name" type="text" {...register("name")} />
              {errors.name && (
                <FieldDescription className="text-destructive">
                  {t(errors.name.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <div className="flex items-center gap-2">
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="city-active"
                      checked={field.value}
                      onCheckedChange={(c) => field.onChange(c === true)}
                    />
                  )}
                />
                <FieldLabel htmlFor="city-active" className="mb-0">
                  {t("Active")}
                </FieldLabel>
              </div>
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
                  ? t("Update City")
                  : t("Create City")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
