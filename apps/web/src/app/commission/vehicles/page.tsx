import { OfflineCrudPage } from "@/components/OfflineCrudPage";

export const dynamic = "force-dynamic";

export default function VehiclesPage() {
  return <OfflineCrudPage resource="vehicles" />;
}
