import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard-layout";
import NewExperimentForm from "@/components/new-experiment-form";

export default async function NewExperimentPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return (
    <DashboardLayout>
      <NewExperimentForm />
    </DashboardLayout>
  );
}
