"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BarChart3, Globe, LineChart, Upload, LogOut, User } from "lucide-react";

const navItems = [
  { label: "Overview", href: "/", icon: BarChart3 },
  { label: "Financial Analysis", href: "/financial-analysis", icon: LineChart },
  { label: "Geographic Analysis", href: "/geographic-analysis", icon: Globe },
  { label: "Upload Portfolio", href: "/upload-portfolio", icon: Upload },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[220px] flex-col border-r border-border/40 bg-white">
      {/* User profile area */}
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <User className="h-5 w-5 text-gray-500" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">Portfolio</p>
          <p className="truncate text-xs text-gray-400">Tracker</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 px-3 pt-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border/40 px-3 py-4">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-900">
          <LogOut className="h-[18px] w-[18px]" />
          Log out
        </button>
      </div>
    </aside>
  );
}
