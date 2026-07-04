import { OfflineCrudPage } from "@/components/OfflineCrudPage";

export const dynamic = "force-dynamic";

export default function OrdersPage() {
  return <OfflineCrudPage resource="orders" />;
}
