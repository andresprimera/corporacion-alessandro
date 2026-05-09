import { useTranslation } from "react-i18next"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { UnitsTab } from "@/components/catalog-attributes/units-tab"
import { PresentationsTab } from "@/components/catalog-attributes/presentations-tab"
import { LiquorTypesTab } from "@/components/catalog-attributes/liquor-types-tab"

export default function CatalogAttributesPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {t("Catalog Attributes")}
        </h2>
        <p className="text-muted-foreground">
          {t(
            "Manage units of measure and product presentations from one place.",
          )}
        </p>
      </div>
      <Tabs defaultValue="units">
        <TabsList>
          <TabsTrigger value="units">{t("Units")}</TabsTrigger>
          <TabsTrigger value="presentations">{t("Presentations")}</TabsTrigger>
          <TabsTrigger value="liquor-types">{t("Liquor Types")}</TabsTrigger>
        </TabsList>
        <TabsContent value="units" className="pt-4">
          <UnitsTab />
        </TabsContent>
        <TabsContent value="presentations" className="pt-4">
          <PresentationsTab />
        </TabsContent>
        <TabsContent value="liquor-types" className="pt-4">
          <LiquorTypesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
