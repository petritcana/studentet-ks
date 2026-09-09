"use client";

import * as React from "react";
import Link from "next/link";
import { Bookmark, LogOut, Settings, User as UserIcon } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BottomNav } from "@/components/layout/bottom-nav";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationsButton } from "@/components/layout/notifications-button";
import { Sidebar } from "@/components/layout/sidebar";
import { BrandLogo } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { PostComposer, type ComposerCourse } from "@/components/feed/post-composer";
import { signOutAction } from "@/lib/actions/auth";

export type ChromeUser = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  isModerator: boolean;
  canUseCampusVoice: boolean;
  level: { name: string; percent: number; next: string | null; toNext: number };
};

/**
 * Kornizë e vetme për të gjithë aplikacionin: sidebar 260px në desktop,
 * bottom nav 64px me FAB në telefon, kolonë e djathtë 320px kur ka çfarë.
 */
export function AppChrome({
  user,
  courses,
  unreadNotifications,
  unreadMessages,
  children,
  rightRail,
}: {
  user: ChromeUser;
  courses: ComposerCourse[];
  unreadNotifications: number;
  unreadMessages: number;
  children: React.ReactNode;
  rightRail?: React.ReactNode;
}) {
  const [composerOpen, setComposerOpen] = React.useState(false);

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2.5 sm:px-6">
          <BrandLogo className="lg:hidden" showText={false} />
          <div className="min-w-0 flex-1 lg:max-w-md">
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle className="hidden md:inline-flex" />
            <NotificationsButton initialUnread={unreadNotifications} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Menyja e llogarisë"
                  className="grid size-10 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                  <Avatar name={user.name} src={user.avatar} size="sm" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href={`/u/${user.username}`}>
                    <UserIcon />
                    Profili im
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/une/ruajtjet">
                    <Bookmark />
                    Ruajtjet
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/cilesimet">
                    <Settings />
                    Cilësimet
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  destructive
                  onSelect={() => {
                    void signOutAction();
                  }}
                >
                  <LogOut />
                  Dil
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] gap-8 px-4 pb-24 pt-6 sm:px-6 lg:pb-10">
        <Sidebar
          className="sticky top-20 hidden h-[calc(100dvh-6rem)] lg:flex"
          level={user.level}
          isModerator={user.isModerator}
          unreadMessages={unreadMessages}
        />

        <main id="permbajtja" className="min-w-0 flex-1 lg:max-w-[720px]">
          {children}
        </main>

        {rightRail ? (
          <aside className="sticky top-20 hidden h-fit w-80 shrink-0 xl:block">
            {rightRail}
          </aside>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setComposerOpen(true)}
        aria-label="Posto diçka"
        className="fixed bottom-6 right-6 z-30 hidden size-14 place-items-center rounded-full bg-brand-500 text-brand-contrast shadow-lifted transition-transform duration-150 ease-brand hover:scale-105 active:scale-95 lg:grid"
      >
        <span className="text-2xl leading-none">+</span>
      </button>

      <BottomNav user={user} onCompose={() => setComposerOpen(true)} />

      <PostComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        user={user}
        courses={courses}
        canUseCampusVoice={user.canUseCampusVoice}
      />
    </div>
  );
}
