import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { isGoogleEnabled } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Hyr",
  description: "Hyr në llogarinë tënde në Studentët.KS.",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user?.onboardedAt) redirect("/feed");
  if (user) redirect("/regjistrohu");

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12 sm:px-6">
      <LoginForm googleEnabled={isGoogleEnabled} />
    </div>
  );
}
