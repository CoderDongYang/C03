import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function wilsonCI(conversions: number, exposures: number, confidence: number = 0.95): { lower: number; upper: number } {
  if (exposures === 0) return { lower: 0, upper: 0 };
  
  const z = confidence === 0.95 ? 1.96 : 1.645;
  const p = conversions / exposures;
  const n = exposures;
  
  const denominator = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denominator;
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n) / denominator;
  
  return {
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
  };
}

function zTestPValue(
  controlConv: number,
  controlExp: number,
  testConv: number,
  testExp: number
): number | null {
  if (controlExp === 0 || testExp === 0) return null;
  
  const p1 = controlConv / controlExp;
  const p2 = testConv / testExp;
  const p = (controlConv + testConv) / (controlExp + testExp);
  
  if (p === 0 || p === 1) return null;
  
  const se = Math.sqrt(p * (1 - p) * (1 / controlExp + 1 / testExp));
  if (se === 0) return null;
  
  const z = (p2 - p1) / se;
  
  return 2 * (1 - normalCDF(Math.abs(z)));
}

function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

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

      const ci = wilsonCI(targetConversionCount, exposureCount);

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
        ciLower: Number((ci.lower * 100).toFixed(2)),
        ciUpper: Number((ci.upper * 100).toFixed(2)),
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
    const controlConv = controlVersion?.conversions || 0;
    const controlExp = controlVersion?.exposures || 0;

    const versionStatsWithLift = versionStats.map((v) => {
      const lift = controlRate > 0
        ? Number((((v.conversionRate - controlRate) / controlRate) * 100).toFixed(2))
        : 0;
      
      const pValue = v.isControl || controlExp === 0 || v.exposures === 0
        ? null
        : zTestPValue(controlConv, controlExp, v.conversions, v.exposures);
      
      const isSignificant = pValue !== null && pValue < 0.05;
      
      return {
        ...v,
        lift,
        liftPercent: lift,
        pValue: pValue !== null ? Number(pValue.toFixed(4)) : null,
        isSignificant,
      };
    });

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
