"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useSyncExternalStore } from "react";
import { 
  Home,
  Sparkles, 
  Building2, 
  Scale, 
  BookmarkCheck, 
  ShieldCheck, 
  User,
  LogOut,
  Menu, 
  X 
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { getStoredUserAuth, clearStoredUserAuth } from "@/lib/api";
import { getCurrentSession, onAuthChange, signOut } from "@/lib/supabase";
import { UserAuth } from "@/types";
import { showToast } from "@/components/Toast";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userAuth, setUserAuth] = useState<UserAuth>(() => getStoredUserAuth());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => getStoredUserAuth().role !== "guest");

  const syncAuth = (sessionUser: { id: string; email?: string; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> } | null) => {
    if (sessionUser) {
      setIsAuthenticated(true);
      const appRole = (sessionUser.app_metadata?.role as string) || (sessionUser.user_metadata?.role as string);
      const storedAuth = getStoredUserAuth();
      const isAdmin = appRole === "admin" || (storedAuth.role === "admin" && Boolean(storedAuth.adminKey));
      const role = isAdmin ? "admin" : "student";
      const name = (sessionUser.user_metadata?.full_name as string) || sessionUser.email?.split("@")[0] || (isAdmin ? "Administrator" : "Student");
      setUserAuth({
        userId: sessionUser.id,
        role,
        name,
        adminKey: storedAuth.adminKey
      });
    } else {
      const auth = getStoredUserAuth();
      setIsAuthenticated(auth.role !== "guest");
      setUserAuth(auth);
    }
  };

  useEffect(() => {
    let active = true;

    getCurrentSession().then((session) => {
      if (active) syncAuth(session?.user ?? null);
    });

    const { data: authSub } = onAuthChange((_event, session) => {
      if (active) syncAuth(session?.user ?? null);
    });

    const handleAuthChange = () => {
      getCurrentSession().then((session) => {
        if (active) syncAuth(session?.user ?? null);
      });
    };

    window.addEventListener("auth-change", handleAuthChange);
    return () => {
      active = false;
      authSub?.subscription?.unsubscribe();
      window.removeEventListener("auth-change", handleAuthChange);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      clearStoredUserAuth();
      setIsAuthenticated(false);
      setUserAuth({ userId: "guest_user", role: "guest", name: "Guest Student" });
      showToast("Signed out successfully.", "info");
      router.push("/login");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error signing out";
      showToast(msg, "error");
    }
  };

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/predictor", label: "Predict", icon: Sparkles, highlight: true },
    { href: "/colleges", label: "Colleges", icon: Building2 },
    { href: "/compare", label: "Compare", icon: Scale },
    { href: "/dashboard", label: "Dashboard", icon: BookmarkCheck },
    { href: "/admin", label: "Admin", icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <BrandLogo size="md" asLink={true} showTagline={true} />

        {/* Desktop Navigation */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold"
                    : link.highlight
                    ? "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800"
                }`}
              >
                <Icon className={`h-4 w-4 ${link.highlight && !isActive ? "text-indigo-600 dark:text-indigo-400" : ""}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User Status & Auth Buttons */}
        <div className="hidden md:flex items-center gap-2">
          {mounted && isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-semibold text-indigo-900 hover:bg-indigo-100/70 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 transition-colors"
              >
                <div className="h-5 w-5 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                  {userAuth.name.charAt(0).toUpperCase()}
                </div>
                <span className="truncate max-w-[120px]">{userAuth.name}</span>
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-300 dark:border-slate-700 dark:text-slate-400 transition-colors"
                title="Sign out of account"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
            >
              <User className="h-3.5 w-3.5 text-slate-500" />
              <span>Sign In</span>
            </Link>
          )}

          <Link
            href="/predictor"
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Predict My Colleges
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 dark:border-slate-800 dark:bg-slate-900 shadow-lg">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
            {mounted && isAuthenticated ? (
              <div className="flex items-center justify-between">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-sm font-semibold text-indigo-600"
                >
                  <User className="h-4 w-4" />
                  Dashboard ({userAuth.name})
                </Link>
                <button
                  onClick={() => { setMobileMenuOpen(false); handleSignOut(); }}
                  className="text-xs font-bold text-rose-600 p-1"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                <User className="h-4 w-4" />
                Sign In / Register
              </Link>
            )}
            <Link
              href="/predictor"
              onClick={() => setMobileMenuOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              <Sparkles className="h-4 w-4" />
              Predict My Colleges
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
