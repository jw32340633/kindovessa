"use client";

import { useAuth } from "@/providers/auth-provider";
import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SidebarNavlink } from "@/data/sidebar-data";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../ui/breadcrumb";
import { Separator } from "../ui/separator";
import { SidebarTrigger } from "../ui/sidebar";

function Header() {
  const { user, logout, loggingOut } = useAuth();
  const initials =
    `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean).slice(1);
  const crumbs = segments.length
    ? segments.map((segment, index) => {
        const url = `/dashboard/${segments.slice(0, index + 1).join("/")}`;
        const title =
          SidebarNavlink.find((item) => item.url === url)?.title ??
          segment
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, (letter) => letter.toUpperCase());
        return { url, title };
      })
    : [
        {
          url: "/dashboard",
          title:
            SidebarNavlink.find((item) => item.url === "/dashboard")?.title ??
            "Dashboard",
        },
      ];
  return (
    <header className="sticky top-0 z-20 flex h-22.5 shrink-0 items-center justify-between border-b bg-background shadow-[0_3px_12px_-6px_rgb(15_23_42/0.10)]">
      <div className="dashboard-layout flex-row items-center justify-between gap-3 py-0 md:gap-3 md:py-0 lg:py-0">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb className="min-w-0 overflow-hidden">
            <BreadcrumbList className="flex-nowrap">
              <BreadcrumbItem className="hidden md:block text-base font-medium">
                Dashboard
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              {crumbs.map((crumb, index) => (
                <Fragment key={crumb.url}>
                  {index > 0 && (
                    <BreadcrumbSeparator className="hidden sm:block" />
                  )}
                  <BreadcrumbItem
                    className={
                      index === crumbs.length - 1
                        ? "min-w-0"
                        : "hidden shrink-0 sm:inline-flex"
                    }
                  >
                    {index === crumbs.length - 1 ? (
                      <BreadcrumbPage className="truncate text-sm font-medium sm:text-base">
                        {crumb.title}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        render={<Link href={crumb.url} />}
                        className="text-base font-medium"
                      >
                        {crumb.title}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="shrink-0">
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  className="size-11 shrink-0 rounded-full p-0"
                />
              }
              aria-label={`Open account options for ${user.firstName} ${user.lastName}`}
            >
              <Avatar className="size-11">
                <AvatarFallback className="bg-sidebar-accent border-3 border-primary font-semibold text-sidebar-accent-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={10}
              className="w-56 max-w-[calc(100vw-2rem)] gap-1 p-1.5"
            >
              <PopoverTitle className="sr-only">Account options</PopoverTitle>
              <Button
                render={<Link href="/dashboard/settings" />}
                nativeButton={false}
                variant="ghost"
                className="h-11 w-full justify-start gap-3 px-3"
              >
                <Settings className="size-4" aria-hidden="true" />
                Settings
              </Button>
              <Separator className="h-0.5" />
              <Button
                type="button"
                variant="ghost"
                onClick={() => void logout()} disabled={loggingOut} className="h-11 w-full justify-start gap-3 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="size-4" aria-hidden="true" />
                {loggingOut ? (
                  <>
                    Signing out
                    <Spinner aria-hidden="true" />
                  </>
                ) : (
                  "Logout"
                )}
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}

export default Header;
