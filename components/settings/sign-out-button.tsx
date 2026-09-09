"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/actions/auth";

export function SignOutButton() {
  return (
    <form action={signOutAction} className="self-start">
      <Button type="submit" variant="secondary" size="sm">
        <LogOut />
        Dil nga llogaria
      </Button>
    </form>
  );
}
