import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useForm, Controller } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { signupSchema } from "@base-dashboard/shared"
import { useQuery } from "@tanstack/react-query"
import { z } from "zod/v4"
import { useAuth } from "@/hooks/use-auth"
import { useNavigate, Link } from "react-router"
import { useState } from "react"
import { toast } from "sonner"
import { fetchCityOptionsApi } from "@/lib/cities"

const signupFormSchema = z
  .intersection(
    signupSchema,
    z.object({ confirmPassword: z.string() }),
  )
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

type SignupValues = z.infer<typeof signupFormSchema>

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const { t } = useTranslation()
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: cityOptions = [], isLoading: isLoadingCities } = useQuery({
    queryKey: ["cities", "options"],
    queryFn: fetchCityOptionsApi,
  })

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: standardSchemaResolver(signupFormSchema),
  })

  async function onSubmit(values: SignupValues) {
    setIsSubmitting(true)
    try {
      await signup(values.name, values.email, values.password, values.cityId)
      navigate("/dashboard")
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Account created, pending approval"
      ) {
        toast.success(t("Account created, pending approval"))
        navigate("/")
        return
      }
      toast.error(error instanceof Error ? t(error.message) : t("Signup failed"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>{t("Create an account")}</CardTitle>
        <CardDescription>
          {t("Enter your information below to create your account")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">{t("Full Name")}</FieldLabel>
              <Input
                id="name"
                type="text"
                placeholder={t("John Doe")}
                {...register("name")}
              />
              {errors.name && (
                <FieldDescription className="text-destructive">
                  {t(errors.name.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="email">{t("Email")}</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder={t("m@example.com")}
                {...register("email")}
              />
              {errors.email && (
                <FieldDescription className="text-destructive">
                  {t(errors.email.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="city">{t("City")}</FieldLabel>
              <Controller
                name="cityId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(val) => {
                      if (val) field.onChange(val)
                    }}
                    disabled={isLoadingCities}
                    items={Object.fromEntries(
                      cityOptions.map((c) => [c.id, c.name]),
                    )}
                  >
                    <SelectTrigger id="city">
                      <SelectValue placeholder={t("Select a city")} />
                    </SelectTrigger>
                    <SelectContent>
                      {cityOptions.map((city) => (
                        <SelectItem key={city.id} value={city.id}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.cityId && (
                <FieldDescription className="text-destructive">
                  {t(errors.cityId.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="password">{t("Password")}</FieldLabel>
              <PasswordInput
                id="password"
                {...register("password")}
              />
              {errors.password && (
                <FieldDescription className="text-destructive">
                  {t(errors.password.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">
                {t("Confirm Password")}
              </FieldLabel>
              <PasswordInput
                id="confirm-password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <FieldDescription className="text-destructive">
                  {t(errors.confirmPassword.message ?? "")}
                </FieldDescription>
              )}
            </Field>
            <FieldGroup>
              <Field>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t("Creating account...") : t("Create Account")}
                </Button>
                <FieldDescription className="px-6 text-center">
                  {t("Already have an account?")}{" "}
                  <Link to="/login" className="underline underline-offset-4">
                    {t("Sign in")}
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
