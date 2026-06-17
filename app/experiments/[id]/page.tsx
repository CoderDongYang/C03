import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard-layout";
import ExperimentDetail from "@/components/experiment-detail";

interface ExperimentPageProps {
  params: { id: string };
}

export default async function ExperimentPage({ params }: ExperimentPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardLayout>
      <ExperimentDetail experimentId={params.id} />
    </DashboardLayout>
  );
}
