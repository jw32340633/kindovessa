"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

import { SidebarNavlink } from "@/data/sidebar-data";

import Logo from "../../../public/favicons/logo";

export function AppSidebar({ className, ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const activeItem = SidebarNavlink.filter((item) => pathname === item.url || (item.url !== "/dashboard" && pathname.startsWith(`${item.url}/`))).sort((a, b) => b.url.length - a.url.length)[0];
  return (
    <Sidebar {...props} className={cn("shadow-[3px_0_14px_-6px_rgb(15_23_42/0.10)]", className)}>
      <SidebarHeader className="h-22.5 items-center justify-center px-4">
        <Link href="/dashboard" aria-label="Kindovessa dashboard" className="max-w-full">
          <Logo className=" font-logo text-[1.75rem]" />
        </Link>
      </SidebarHeader>
      <SidebarContent className="pt-4">
        <SidebarGroup className="px-3">
          <SidebarMenu className="gap-2">
            {SidebarNavlink.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton render={<Link href={item.url} />} isActive={activeItem?.url === item.url} aria-current={pathname === item.url ? "page" : undefined} className="h-12 gap-3 rounded-lg px-3 text-base font-medium data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground [&>svg]:size-5">
                  <Image src={item.icon} alt="" width={24} height={24} className="size-6 shrink-0 object-contain" />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

export default AppSidebar;
