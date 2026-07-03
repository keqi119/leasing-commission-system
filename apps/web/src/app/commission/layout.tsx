import { CommissionShell } from "@/components/CommissionShell";

export default function CommissionLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return <CommissionShell>{children}</CommissionShell>;
}

