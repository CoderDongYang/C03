import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request
) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { available: false, error: "缺少 slug 参数" },
        { status: 400 }
      );
    }

    const existing = await prisma.experiment.findUnique({
      where: { slug },
      select: { id: true },
    });

    return NextResponse.json({
      available: !existing,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "检查 slug 失败" },
      { status: 500 }
    );
  }
}
