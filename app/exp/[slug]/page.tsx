import { Suspense } from "react";
import ExperimentPageClient from "@/components/experiment-page-client";

interface ExperimentPageProps {
  params: { slug: string };
}

export default function ExperimentPage({ params }: ExperimentPageProps) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-500">加载中...</p></div>}>
      <ExperimentPageClient slug={params.slug} />
    </Suspense>
  );
}
