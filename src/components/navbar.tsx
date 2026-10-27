"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { BsAvatar, BsNavigationHeader, BsTab, BsTabs } from "@brandsync/react";
import {
  ArrowCounterClockwise,
  Bell,
  Buildings as Building2,
  Eye,
  FolderSimple as FileStack,
  SquaresFour as LayoutDashboard,
  SignOut as LogOut,
  Gear as Settings,
  User,
  WarningCircle,
} from "@phosphor-icons/react";

import {
  Menu,
  MenuAction,
  MenuButton,
  MenuHeader,
  MenuSection,
  MenuSurface,
} from "@/components/ui/menu";
import { GlobalSearch } from "@/components/global-search";
import { SettingsDialog } from "@/components/settings-dialog";
import { resetBatches } from "@/lib/store";
import { useCurrentOrgId, useOrgBatches, useRole } from "@/lib/use-store";

const ORG_LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/batches", label: "Batches", icon: FileStack },
] as const;

const SUPER_ADMIN_LINKS = [
  { href: "/organizations", label: "Organizations", icon: Building2 },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const role = useRole();
  const currentOrgId = useCurrentOrgId();
  const batches = useOrgBatches(currentOrgId);
  const failedBatchCount = batches.filter((batch) => batch.state === "failed" || batch.state === "partial").length;
  const reviewBatchCount = batches.filter((batch) => batch.state === "review").length;
  const notificationCount = failedBatchCount + reviewBatchCount;

  // The square tile behind the logo mark is two SVG paths in nested shadow DOM, which CSS cannot reach.
  const onLogin = pathname === "/login";
  useEffect(() => {
    if (onLogin) return;
    const hideTile = () => {
      const logo = document.querySelector("bs-navigation-header")?.shadowRoot?.querySelector("bs-logo");
      const paths = logo?.shadowRoot?.querySelectorAll<SVGPathElement>("svg > g:first-child > path#Vector, svg > g:first-child > path#Vector_2");
      paths?.forEach((path) => { path.style.display = "none"; });
      return Boolean(paths?.length);
    };
    if (hideTile()) return;
    const timer = window.setInterval(() => { if (hideTile()) window.clearInterval(timer); }, 100);
    return () => window.clearInterval(timer);
  }, [onLogin]);

  const links =
    role === "super_admin" ? [...ORG_LINKS, ...SUPER_ADMIN_LINKS] : ORG_LINKS;
  const isActive = (href: string) =>
    href === "/" ? pathname === href : pathname.startsWith(href);

  if (pathname === "/login") return null;

  return (
    <>
      <BsNavigationHeader
        alignment="default"
        ariaLabel="EG Flow application header"
        className="app-navigation-header"
      >
        <div slot="left" className="app-navigation-header__left">
          <nav aria-label="Primary" className="hidden min-w-0 self-stretch overflow-x-auto sm:flex">
            <BsTabs type="bs-tab">
            {links.map((link) => (
              <BsTab
                key={link.href}
                selected={isActive(link.href)}
                onBsSelect={() => router.push(link.href)}
              >
                {link.label}
              </BsTab>
            ))}
            </BsTabs>
          </nav>
        </div>

        <div slot="right" className="app-navigation-header__right">
          <GlobalSearch />
          <Menu>
            <MenuButton
              aria-label={`Notifications${notificationCount ? `, ${notificationCount} items` : ""}`}
              className="nav-notifications-trigger"
            >
              <Bell size={20} aria-hidden="true" />
              {notificationCount > 0 && (
                <span className="nav-notifications-count" aria-hidden="true" />
              )}
            </MenuButton>
            <MenuSurface align="right">
              <MenuSection>
                <MenuHeader>Notifications</MenuHeader>
                {failedBatchCount > 0 && (
                  <MenuAction icon={WarningCircle} onClick={() => router.push("/batches?state=failed")}>
                    {failedBatchCount} failed {failedBatchCount === 1 ? "batch" : "batches"} need attention
                  </MenuAction>
                )}
                {reviewBatchCount > 0 && (
                  <MenuAction icon={Eye} onClick={() => router.push("/batches?state=review")}>
                    {reviewBatchCount} {reviewBatchCount === 1 ? "batch awaits" : "batches await"} review
                  </MenuAction>
                )}
                {notificationCount === 0 && (
                  <p className="nav-notifications-empty">You’re all caught up.</p>
                )}
              </MenuSection>
            </MenuSurface>
          </Menu>
          <Menu>
          <MenuButton
            aria-label="Open profile menu"
            className="p-0"
          >
            <BsAvatar
              type="initials"
              initials="JF"
              size="sm"
              ariaLabel="jfern profile"
            />
          </MenuButton>
          <MenuSurface align="right" className="[&_.bs-menu-item]:border-b-0 [&_.bs-menu-header]:border-b-0">
            <MenuSection>
              <MenuHeader>jfern@eg.dk</MenuHeader>
              <MenuAction icon={User} onClick={() => router.push("/profile")}>
                Profile
              </MenuAction>
              {role !== "super_admin" && (
                <MenuAction icon={Settings} onClick={() => setSettingsOpen(true)}>
                  Settings
                </MenuAction>
              )}
            </MenuSection>
            <MenuAction
              icon={ArrowCounterClockwise}
              onClick={() => {
                resetBatches();
                toast.success("Demo data reset", { description: "All batches are back to their starting state." });
              }}
            >
              Reset demo data
            </MenuAction>
            <MenuAction icon={LogOut} danger onClick={() => router.push("/login")}>
              Log out
            </MenuAction>
          </MenuSurface>
        </Menu>
        </div>
      </BsNavigationHeader>

      <nav aria-label="Primary" className="app-mobile-navigation sm:hidden">
        <BsTabs type="bs-tab" className="app-mobile-navigation__tabs">
          {links.map((link) => {
            return (
              <BsTab
                key={link.href}
                selected={isActive(link.href)}
                onBsSelect={() => router.push(link.href)}
              >
                {link.label}
              </BsTab>
            );
          })}
        </BsTabs>
      </nav>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
