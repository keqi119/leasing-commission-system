import { OfflineCrudPage } from "@/components/OfflineCrudPage";

export const dynamic = "force-dynamic";

export default function DepositsPage() {
  return <OfflineCrudPage resource="deposits" />;
}
