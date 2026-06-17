import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const experiment = await prisma.experiment.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: { versions: true },
    });

    if (!experiment) {
      return NextResponse.json({ error: "实验不存在" }, { status: 404 });
    }

    const exposureCounts = await prisma.exposure.groupBy({
      by: ["versionId"],
      where: { experimentId: params.id },
      _count: { id: true },
    });

    const conversionCounts = await prisma.conversion.groupBy({
      by: ["versionId", "eventName"],
      where: { experimentId: params.id },
      _count: { id: true },
    });

    const targetEventName = experiment.targetEvent;

    const versionStats = experiment.versions.map((version) => {
      const exposureCount =
        exposureCounts.find((e) => e.versionId === version.id)?._count.id || 0;

      const targetConversions = conversionCounts.filter(
        (c) =>
          c.versionId === version.id && c.eventName === targetEventName
      );
      const targetConversionCount = targetConversions.reduce(
        (sum, c) => sum + c._count.id,
        0
      );

      const conversionRate =
        exposureCount > 0
          ? (targetConversionCount / exposureCount) * 100
          : 0;

      const allConversions: Record<string, number> = {};
      conversionCounts
        .filter((c) => c.versionId === version.id)
        .forEach((c) => {
          allConversions[c.eventName] =
            (allConversions[c.eventName] || 0) + c._count.id;
        });

      return {
        versionId: version.id,
        versionName: version.name,
        isControl: version.isControl,
        exposures: exposureCount,
        conversions: targetConversionCount,
        conversionRate: Number(conversionRate.toFixed(2)),
        allConversions,
      };
    });

    const totalExposures = versionStats.reduce(
      (sum, v) => sum + v.exposures,
      0
    );
    const totalConversions = versionStats.reduce(
      (sum, v) => sum + v.conversions,
      0
    );

    const controlVersion = versionStats.find((v) => v.isControl);
    const controlRate = controlVersion?.conversionRate || 0;

    const versionStatsWithLift = versionStats.map((v) => ({
      ...v,
      lift: controlRate > 0
        ? Number((((v.conversionRate - controlRate) / controlRate) * 100).toFixed(2))
        : 0,
    }));

    return NextResponse.json({
      stats: {
        totalExposures,
        totalConversions,
        overallConversionRate:
          totalExposures > 0
            ? Number(((totalConversions / totalExposures) * 100).toFixed(2))
            : 0,
        targetEvent: targetEventName,
      },
      versions: versionStatsWithLift,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "获取统计数据失败" },
      { status: 500 }
    );
  }
}
