import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashAssignVersion } from "@/lib/hash";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const visitorId = searchParams.get("visitorId");
    const previewVersionId = searchParams.get("preview");

    if (!visitorId && !previewVersionId) {
      return NextResponse.json(
        { error: "缺少 visitorId 参数" },
        { status: 400 }
      );
    }

    const experiment = await prisma.experiment.findUnique({
      where: { slug: params.slug },
      include: { versions: true },
    });

    if (!experiment) {
      return NextResponse.json(
        { error: "实验不存在", status: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (previewVersionId) {
      const version = experiment.versions.find(
        (v) => v.id === previewVersionId
      );
      if (!version) {
        return NextResponse.json(
          { error: "版本不存在", status: "NOT_FOUND" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        experiment: {
          id: experiment.id,
          name: experiment.name,
          status: experiment.status,
          targetEvent: experiment.targetEvent,
        },
        version: {
          id: version.id,
          name: version.name,
          code: version.code,
          isControl: version.isControl,
        },
        isPreview: true,
      });
    }

    if (experiment.status !== "RUNNING") {
      const statusMessages: Record<string, string> = {
        DRAFT: "实验尚未启动",
        PAUSED: "实验已暂停",
        ARCHIVED: "实验已归档",
      };
      const message = statusMessages[experiment.status] || "实验已结束";
      return NextResponse.json(
        { error: message, status: experiment.status },
        { status: 400 }
      );
    }

    const weights = experiment.versions.map((v) => ({
      versionId: v.id,
      weight: v.weight,
    }));

    const assignedVersionId = hashAssignVersion(
      experiment.id,
      visitorId!,
      weights
    );

    const version = experiment.versions.find(
      (v) => v.id === assignedVersionId
    )!;

    return NextResponse.json({
      experiment: {
        id: experiment.id,
        name: experiment.name,
        status: experiment.status,
        targetEvent: experiment.targetEvent,
      },
      version: {
        id: version.id,
        name: version.name,
        code: version.code,
        isControl: version.isControl,
      },
      isPreview: false,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "获取实验数据失败" },
      { status: 500 }
    );
  }
}
