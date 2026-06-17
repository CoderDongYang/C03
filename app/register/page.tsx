import { Suspense } from "react";
import RegisterClient from "@/components/register-client";

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    }>
      <RegisterClient />
    </Suspense>
  );
}
