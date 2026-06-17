import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : JSON.stringify(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
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

    const versionMap: Record<string, string> = {};
    experiment.versions.forEach((v) => {
      versionMap[v.id] = v.name;
    });

    const exposures = await prisma.exposure.findMany({
      where: { experimentId: params.id },
      orderBy: { createdAt: "asc" },
    });

    const conversions = await prisma.conversion.findMany({
      where: { experimentId: params.id },
      orderBy: { createdAt: "asc" },
    });

    const headers = [
      "访客ID",
      "事件类型",
      "事件名",
      "版本",
      "时间",
      "metadata",
    ];

    const rows: string[][] = [];

    exposures.forEach((exposure) => {
      rows.push([
        exposure.visitorId,
        "exposure",
        "曝光",
        versionMap[exposure.versionId] || exposure.versionId,
        new Date(exposure.createdAt).toISOString(),
        "",
      ]);
    });

    conversions.forEach((conversion) => {
      rows.push([
        conversion.visitorId,
        "conversion",
        conversion.eventName,
        versionMap[conversion.versionId] || conversion.versionId,
        new Date(conversion.createdAt).toISOString(),
        conversion.metadata ? JSON.stringify(conversion.metadata) : "",
      ]);
    });

    rows.sort((a, b) => (a[4] > b[4] ? 1 : -1));

    const csvContent =
      [headers.join(","), ...rows.map((row) => row.map(escapeCSV).join(","))].join(
        "\n"
      ) + "\n";

    const BOM = "\uFEFF";
    const buffer = Buffer.from(BOM + csvContent, "utf-8");
    const filename = `experiment-${experiment.slug}-events-${Date.now()}.csv`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "导出CSV失败" },
      { status: 500 }
    );
  }
}
