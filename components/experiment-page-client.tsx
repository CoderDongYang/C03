"use client";

import { useState, useEffect, useRef } from "react";
import { generateUUID } from "@/lib/utils";

const VISITOR_COOKIE_KEY = "ab_test_visitor_id";
const EXPOSURE_LOCALSTORAGE_PREFIX = "ab_exposure_";

interface ExperimentData {
  experiment: {
    id: string;
    name: string;
    status: string;
    targetEvent: string;
  };
  version: {
    id: string;
    name: string;
    code: string;
    isControl: boolean;
  };
  isPreview: boolean;
}

interface ExperimentPageProps {
  slug: string;
}

export default function ExperimentPageClient({ slug }: ExperimentPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ExperimentData | null>(null);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const previewVersionId = urlParams.get("preview");

        let vid = getCookie(VISITOR_COOKIE_KEY);
        if (!vid) {
          vid = generateUUID();
          setCookie(VISITOR_COOKIE_KEY, vid, 365);
        }
        setVisitorId(vid);

        const apiUrl = previewVersionId
          ? `/api/exp/${slug}?preview=${previewVersionId}`
          : `/api/exp/${slug}?visitorId=${vid}`;

        const response = await fetch(apiUrl);
        const result = await response.json();

        if (!response.ok || result.error) {
          setError(result.error || "加载失败");
          setLoading(false);
          return;
        }

        setData(result);

        if (!result.isPreview && result.experiment.status === "RUNNING") {
          const exposureKey = EXPOSURE_LOCALSTORAGE_PREFIX + result.experiment.id;
          if (!localStorage.getItem(exposureKey)) {
            await trackExposure(
              result.experiment.id,
              result.version.id,
              vid
            );
            localStorage.setItem(exposureKey, "1");
          }
        }
      } catch (err) {
        setError("加载失败，请稍后重试");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [slug]);

  useEffect(() => {
    if (!data || !containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = data.version.code;

    const scripts = container.querySelectorAll("script");
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }, [data]);

  useEffect(() => {
    if (!data || !visitorId) return;

    const track = (eventName?: string, extraData?: Record<string, any>) => {
      if (data.isPreview || data.experiment.status !== "RUNNING") return;

      const event = eventName || data.experiment.targetEvent;
      trackConversion(data.experiment.id, data.version.id, visitorId, event, extraData);
    };

    (window as any).__track = track;

    return () => {
      delete (window as any).__track;
    };
  }, [data, visitorId]);

  const trackExposure = async (
    experimentId: string,
    versionId: string,
    vid: string
  ) => {
    try {
      await fetch("/api/track/exposure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experimentId,
          versionId,
          visitorId: vid,
        }),
      });
    } catch (err) {
      console.error("Failed to track exposure:", err);
    }
  };

  const trackConversion = async (
    experimentId: string,
    versionId: string,
    vid: string,
    eventName: string,
    metadata?: Record<string, any>
  ) => {
    try {
      await fetch("/api/track/conversion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experimentId,
          versionId,
          visitorId: vid,
          eventName,
          metadata,
        }),
      });
    } catch (err) {
      console.error("Failed to track conversion:", err);
    }
  };

  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
    return null;
  };

  const setCookie = (name: string, value: string, days: number) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-xl font-medium text-gray-800 mb-2">无法访问实验</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {data?.isPreview && (
        <div className="bg-yellow-50 border-b border-yellow-200 py-2 px-4 text-center text-sm text-yellow-800">
          预览模式 - {data.version.name}
          {data.version.isControl ? " (对照组)" : ""} - 不上报数据
        </div>
      )}
      <div ref={containerRef} className="experiment-content" />
    </div>
  );
}
