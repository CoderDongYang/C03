import { Suspense } from "react";
import LoginClient from "@/components/login-client";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-muted/30"><p className="text-muted-foreground">加载中...</p></div>}>
      <LoginClient />
    </Suspense>
  );
}
