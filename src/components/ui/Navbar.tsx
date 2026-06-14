"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Trophy, BarChart2, List, Settings, LogOut, User, Home, Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", icon: Home, label: "בית" },
  { href: "/leaderboard", icon: BarChart2, label: "טבלה" },
  { href: "/results", icon: List, label: "תוצאות" },
  { href: "/bet", icon: Trophy, label: "הימורים" },
];

export default function Navbar() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const navItems = isAdmin
    ? [...NAV_ITEMS, { href: "/admin", icon: Settings, label: "ניהול" }]
    : NAV_ITEMS;

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50" ref={menuRef}>
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg text-white shrink-0"
          onClick={() => setMenuOpen(false)}
        >
          <Trophy className="text-yellow-400" size={22} />
          <span>WC 2026</span>
        </Link>

        {/* Desktop navigation */}
        {session && (
          <div className="hidden sm:flex items-center gap-1">
            {navItems.map(({ href, icon: Icon, label }) => (
              <NavLink key={href} href={href} active={pathname === href}>
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </div>
        )}

        {/* Desktop user menu */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          {session ? (
            <>
              <span className="text-sm text-gray-400 flex items-center gap-1.5">
                <User size={14} />
                {session.user?.name ?? session.user?.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-400 transition-colors"
              >
                <LogOut size={15} />
                יציאה
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm bg-green-600 hover:bg-green-500 px-3 py-1.5 rounded-md font-medium transition-colors"
            >
              כניסה
            </Link>
          )}
        </div>

        {/* Mobile: hamburger */}
        {session && (
          <button
            className="sm:hidden p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "סגור תפריט" : "פתח תפריט"}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        )}
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && session && (
        <div className="sm:hidden border-t border-gray-800 bg-gray-900">
          {/* User info */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-800/60">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
              <User size={15} className="text-gray-300" />
            </div>
            <span className="text-sm text-gray-300 font-medium truncate">
              {session.user?.name ?? session.user?.email}
            </span>
          </div>

          {/* Nav links */}
          <div className="py-2">
            {navItems.map(({ href, icon: Icon, label }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "text-white bg-gray-800"
                      : "text-gray-400 hover:text-white hover:bg-gray-800/60"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-green-400" : "text-gray-500"} />
                  {label}
                  {isActive && (
                    <span className="mr-auto w-1.5 h-1.5 rounded-full bg-green-400" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Logout */}
          <div className="border-t border-gray-800/60 py-2">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800/60 transition-colors"
            >
              <LogOut size={18} className="text-gray-500" />
              יציאה
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active
          ? "text-white bg-gray-800"
          : "text-gray-400 hover:text-white hover:bg-gray-800"
      }`}
    >
      {children}
    </Link>
  );
}
