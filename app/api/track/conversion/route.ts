import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const conversionSchema = z.object({
  experimentId: z.string(),
  versionId: z.string(),
  visitorId: z.string(),
  eventName: z.string().min(1),
  metadata: z.any().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = conversionSchema.parse(body);

    const experiment = await prisma.experiment.findUnique({
      where: { id: validated.experimentId },
    });

    if (!experiment) {
      return NextResponse.json({ error: "实验不存在" }, { status: 404 });
    }

    await prisma.conversion.create({
      data: {
        experimentId: validated.experimentId,
        versionId: validated.versionId,
        visitorId: validated.visitorId,
        eventName: validated.eventName,
        metadata: validated.metadata || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
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
