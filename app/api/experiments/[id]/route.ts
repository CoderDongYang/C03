import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateExperimentSchema = z.object({
  name: z.string().min(1, "实验名称不能为空").optional(),
  targetEvent: z.string().min(1, "目标事件名不能为空").optional(),
  description: z.string().optional(),
  status: z.enum(["DRAFT", "RUNNING", "PAUSED", "ARCHIVED"]).optional(),
  versions: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1, "版本名称不能为空"),
        weight: z.number().int().min(0).max(100),
        code: z.string().min(1, "版本代码不能为空"),
        isControl: z.boolean(),
      })
    )
    .optional(),
});

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
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        versions: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!experiment) {
      return NextResponse.json({ error: "实验不存在" }, { status: 404 });
    }

    return NextResponse.json({ experiment });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "获取实验详情失败" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const existing = await prisma.experiment.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: { versions: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "实验不存在" }, { status: 404 });
    }

    const body = await req.json();
    const validated = updateExperimentSchema.parse(body);

    if (validated.status) {
      if (existing.status === "RUNNING" && validated.status === "DRAFT") {
        return NextResponse.json(
          { error: "运行中的实验不能退回草稿状态" },
          { status: 400 }
        );
      }
      if (
        existing.status !== "DRAFT" &&
        (validated.versions || validated.name || validated.targetEvent)
      ) {
        if (validated.status !== "ARCHIVED") {
          return NextResponse.json(
            { error: "非草稿状态下只能修改状态" },
            { status: 400 }
          );
        }
      }
    }

    if (validated.versions) {
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
    }

    const updateData: any = {};
    if (validated.name) updateData.name = validated.name;
    if (validated.targetEvent) updateData.targetEvent = validated.targetEvent;
    if (validated.description !== undefined)
      updateData.description = validated.description;
    if (validated.status) updateData.status = validated.status;

    if (validated.versions && existing.status === "DRAFT") {
      updateData.versions = {
        deleteMany: {},
        create: validated.versions.map((v) => ({
          name: v.name,
          weight: v.weight,
          code: v.code,
          isControl: v.isControl,
        })),
      };
    }

    const experiment = await prisma.experiment.update({
      where: { id: params.id },
      data: updateData,
      include: { versions: true },
    });

    return NextResponse.json({ experiment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "更新实验失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const existing = await prisma.experiment.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "实验不存在" }, { status: 404 });
    }

    await prisma.experiment.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "删除实验失败" },
      { status: 500 }
    );
  }
}
