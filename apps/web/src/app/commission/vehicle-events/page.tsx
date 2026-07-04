import { OfflineCrudPage } from "@/components/OfflineCrudPage";

export const dynamic = "force-dynamic";

export default function VehicleEventsPage() {
  return <OfflineCrudPage resource="vehicle-events" />;
}
