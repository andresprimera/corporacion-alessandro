import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useForm, Controller } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createClientSchema,
  type Client,
  type CreateClientInput,
} from "@base-dashboard/shared"
import { createClientApi, updateClientApi } from "@/lib/clients"
import {
  fetchSalesPersonOptionsApi,
  salesPersonOptionsQueryKey,
} from "@/lib/users"
import { useAuth } from "@/hooks/use-auth"
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

const defaultValues: CreateClientInput = {
  name: "",
  rif: "",
  address: "",
  phone: "",
  salesPersonId: "",
}

function formatRif(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function clientToFormValues(client: Client): CreateClientInput {
  return {
    name: client.name,
    rif: client.rif,
    address: client.address,
    phone: client.phone,
    salesPersonId: client.salesPersonId,
  }
}

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: Client
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isEdit = client !== undefined
  const isAdmin = user?.role === "admin"

  const salesPersonsQuery = useQuery({
    queryKey: salesPersonOptionsQueryKey,
    queryFn: fetchSalesPersonOptionsApi,
    enabled: open && isAdmin,
  })

  const salesPersons = salesPersonsQuery.data ?? []

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<CreateClientInput>({
    resolver: standardSchemaResolver(createClientSchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      reset(client ? clientToFormValues(client) : defaultValues)
    }
  }, [open, client, reset])

  const mutation = useMutation({
    mutationFn: (values: CreateClientInput) =>
      isEdit
        ? updateClientApi(client.id, values)
        : createClientApi(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      toast.success(isEdit ? t("Client updated") : t("Client created"))
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(
        t(error.message) ||
          (isEdit
            ? t("Failed to update client")
            : t("Failed to create client")),
      )
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("Edit Client") : t("Add Client")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("Update client details")
              : t("Create a new client")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="client-name">{t("Name")}</FieldLabel>
              <Input id="client-name" type="text" {...register("name")} />
              {errors.name && (
                <FieldDescription className="text-destructive">
                  {t(errors.name.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="client-rif">{t("RIF")}</FieldLabel>
              <Controller
                name="rif"
                control={control}
                render={({ field }) => (
                  <Input
                    id="client-rif"
                    type="text"
                    inputMode="numeric"
                    placeholder="999.999.999-9"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(formatRif(e.target.value))
                    }
                  />
                )}
              />
              {errors.rif && (
                <FieldDescription className="text-destructive">
                  {t(errors.rif.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="client-address">{t("Address")}</FieldLabel>
              <Input
                id="client-address"
                type="text"
                {...register("address")}
              />
              {errors.address && (
                <FieldDescription className="text-destructive">
                  {t(errors.address.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="client-phone">{t("Phone")}</FieldLabel>
              <Input id="client-phone" type="tel" {...register("phone")} />
              {errors.phone && (
                <FieldDescription className="text-destructive">
                  {t(errors.phone.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            {isAdmin && (
              <Field>
                <FieldLabel>{t("Sales Person")}</FieldLabel>
                <Controller
                  name="salesPersonId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("Select sales person")} />
                      </SelectTrigger>
                      <SelectContent>
                        {salesPersons.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.salesPersonId && (
                  <FieldDescription className="text-destructive">
                    {t(errors.salesPersonId.message ?? "")}
                  </FieldDescription>
                )}
              </Field>
            )}
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
                  ? t("Update Client")
                  : t("Create Client")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
