"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Trophy, BarChart2, List, Settings, LogOut, User } from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-white">
          <Trophy className="text-yellow-400" size={22} />
          <span>WC 2026</span>
        </Link>

        {/* Navigation links */}
        {session && (
          <div className="flex items-center gap-1">
            <NavLink href="/leaderboard">
              <BarChart2 size={16} />
              טבלה
            </NavLink>
            <NavLink href="/results">
              <List size={16} />
              תוצאות
            </NavLink>
            <NavLink href="/bet">
              <Trophy size={16} />
              הימורים
            </NavLink>
            {isAdmin && (
              <NavLink href="/admin">
                <Settings size={16} />
                ניהול
              </NavLink>
            )}
          </div>
        )}

        {/* User menu */}
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <span className="text-sm text-gray-400 flex items-center gap-1">
                <User size={14} />
                {session.user?.name ?? session.user?.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-400 transition-colors"
              >
                <LogOut size={16} />
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
      </div>
    </nav>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
    >
      {children}
    </Link>
  );
}
