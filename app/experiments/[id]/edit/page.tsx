import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardLayout from "@/components/dashboard-layout";
import NewExperimentForm from "@/components/new-experiment-form";

interface EditExperimentPageProps {
  params: { id: string };
}

export default async function EditExperimentPage({
  params,
}: EditExperimentPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const experiment = await prisma.experiment.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      versions: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!experiment) {
    redirect("/dashboard");
  }

  const initialData = {
    id: experiment.id,
    name: experiment.name,
    slug: experiment.slug,
    targetEvent: experiment.targetEvent,
    description: experiment.description,
    status: experiment.status,
    versions: experiment.versions.map((v) => ({
      id: v.id,
      name: v.name,
      weight: v.weight,
      code: v.code,
      isControl: v.isControl,
    })),
  };

  return (
    <DashboardLayout>
      <NewExperimentForm isEdit={true} initialData={initialData} />
    </DashboardLayout>
  );
}
