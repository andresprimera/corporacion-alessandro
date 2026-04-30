import { useTranslation } from "react-i18next"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function UserDashboard() {
  const { t } = useTranslation()
  return (
    <div className="flex justify-center px-4 py-8 lg:px-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>{t("Welcome")}</CardTitle>
          <CardDescription>
            {t(
              "Your account is active. Contact an administrator to be assigned a role with access to platform features.",
            )}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
