import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateSlug } from "@/lib/utils";

export const dynamic = "force-dynamic";

const createExperimentSchema = z.object({
  name: z.string().min(1, "实验名称不能为空"),
  targetEvent: z.string().min(1, "目标事件名不能为空"),
  slug: z.string().min(1, "slug 不能为空").optional(),
  description: z.string().optional(),
  versions: z
    .array(
      z.object({
        name: z.string().min(1, "版本名称不能为空"),
        weight: z.number().int().min(0).max(100),
        code: z.string().min(1, "版本代码不能为空"),
        isControl: z.boolean(),
      })
    )
    .min(2, "至少需要 2 个版本"),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await req.json();
    const validated = createExperimentSchema.parse(body);

    const totalWeight = validated.versions.reduce(
      (sum, v) => sum + v.weight,
      0
    );
    if (totalWeight !== 100) {
      return NextResponse.json(
        { error: "版本权重之和必须等于 100" },
        { status: 400 }
      );
    }

    const controlCount = validated.versions.filter((v) => v.isControl).length;
    if (controlCount !== 1) {
      return NextResponse.json(
        { error: "有且只能有一个对照组" },
        { status: 400 }
      );
    }

    let slug = validated.slug || generateSlug();
    let slugExists = await prisma.experiment.findUnique({ where: { slug } });
    while (slugExists) {
      slug = generateSlug();
      slugExists = await prisma.experiment.findUnique({ where: { slug } });
    }

    const experiment = await prisma.experiment.create({
      data: {
        name: validated.name,
        slug,
        targetEvent: validated.targetEvent,
        description: validated.description,
        userId: session.user.id,
        versions: {
          create: validated.versions.map((v) => ({
            name: v.name,
            weight: v.weight,
            code: v.code,
            isControl: v.isControl,
          })),
        },
      },
      include: {
        versions: true,
      },
    });

    return NextResponse.json({ experiment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "创建实验失败，请重试" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get("includeArchived") === "true";

    const experiments = await prisma.experiment.findMany({
      where: {
        userId: session.user.id,
        ...(includeArchived ? {} : { status: { not: "ARCHIVED" } }),
      },
      include: {
        versions: {
          select: {
            id: true,
            name: true,
            weight: true,
            isControl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ experiments });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "获取实验列表失败" },
      { status: 500 }
    );
  }
}
