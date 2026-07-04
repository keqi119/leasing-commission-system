import { OfflineCrudPage } from "@/components/OfflineCrudPage";

export const dynamic = "force-dynamic";

export default function EmployeesPage() {
  return <OfflineCrudPage resource="employees" />;
}
