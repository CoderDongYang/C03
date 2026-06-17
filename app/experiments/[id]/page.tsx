import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard-layout";
import ExperimentDetail from "@/components/experiment-detail";

export default async function ExperimentPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return (
    <DashboardLayout>
      <ExperimentDetail experimentId={params.id} />
    </DashboardLayout>
  );
}
