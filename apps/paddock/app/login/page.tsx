import { headers } from "next/headers";
import { LoginButton } from "@/components/login-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await getSession({ headers: await headers() });
  if (session && session.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <LoginButton provider="github" />
          <LoginButton provider="google" />
        </CardContent>
      </Card>
    </div>
  );
}
