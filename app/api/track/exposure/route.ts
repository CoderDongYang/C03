import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const exposureSchema = z.object({
  experimentId: z.string(),
  versionId: z.string(),
  visitorId: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = exposureSchema.parse(body);

    const existing = await prisma.exposure.findUnique({
      where: {
        experimentId_visitorId: {
          experimentId: validated.experimentId,
          visitorId: validated.visitorId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ success: true, duplicated: true });
    }

    await prisma.exposure.create({
      data: {
        experimentId: validated.experimentId,
        versionId: validated.versionId,
        visitorId: validated.visitorId,
      },
    });

    return NextResponse.json({ success: true, duplicated: false });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "上报失败" },
      { status: 500 }
    );
  }
}
