"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { 
  User, 
  ShieldCheck, 
  KeyRound, 
  LogOut,
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2
} from "lucide-react";
import { 
  signInWithEmail, 
  signUpWithEmail, 
  signOut, 
  getCurrentSession, 
  onAuthChange 
} from "@/lib/supabase";
import { getStoredUserAuth, setStoredUserAuth } from "@/lib/api";
import { UserAuth } from "@/types";
import { showToast } from "@/components/Toast";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";

  const [mode, setMode] = useState<"signin" | "signup" | "admin">("signin");
  const [currentAuth, setCurrentAuth] = useState<UserAuth>({ userId: "", role: "guest", name: "Guest" });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Admin Key
  const [adminKey, setAdminKey] = useState("");

  useEffect(() => {
    // Check current session
    getCurrentSession().then((session) => {
      if (session?.user) {
        const name = session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Student";
        setCurrentAuth({
          userId: session.user.id,
          role: "student",
          name
        });
      } else {
        const auth = getStoredUserAuth();
        setCurrentAuth(auth);
      }
    });

    const { data: authSub } = onAuthChange((event, session) => {
      if (session?.user) {
        const name = session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Student";
        setCurrentAuth({
          userId: session.user.id,
          role: "student",
          name
        });
      } else {
        setCurrentAuth({ userId: "", role: "guest", name: "Guest" });
      }
    });

    return () => {
      authSub?.subscription?.unsubscribe();
    };
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const { data, error } = await signInWithEmail(email.trim(), password);
      if (error) {
        setErrorMsg(error.message || "Failed to sign in. Please check your email and password.");
        return;
      }
      if (data?.user) {
        const name = data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "Student";
        showToast(`Welcome back, ${name}!`, "success");
        router.push(redirectUrl);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred during sign in.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter your password.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await signUpWithEmail(email.trim(), password, fullName.trim());
      if (error) {
        setErrorMsg(error.message || "Failed to create account.");
        return;
      }
      if (data?.user) {
        const name = fullName.trim() || data.user.email?.split("@")[0] || "Student";
        showToast(`Account created successfully! Welcome, ${name}!`, "success");
        router.push(redirectUrl);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const key = adminKey.trim();
    if (!key) {
      showToast("Please enter the administrator secret key.", "error");
      return;
    }

    const auth: UserAuth = {
      userId: "admin_master",
      role: "admin",
      name: "Platform Administrator",
      adminKey: key
    };
    setStoredUserAuth(auth);
    setCurrentAuth(auth);
    showToast("Authenticated as Administrator!", "success");
    router.push("/admin");
  };

  const handleLogout = async () => {
    try {
      await signOut();
      const guestAuth: UserAuth = {
        userId: "guest_user",
        role: "guest",
        name: "Guest Student"
      };
      setStoredUserAuth(guestAuth);
      setCurrentAuth(guestAuth);
      showToast("Signed out successfully.", "info");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error signing out", "error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 flex items-center justify-center">
      <div className="w-full max-w-md px-4 sm:px-6">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BrandLogo size="lg" asLink={true} showText={false} />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {mode === "signin" ? "Sign In to CETCompass" : mode === "signup" ? "Create Student Account" : "Administrator Access"}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {mode === "signin" 
              ? "Access your saved colleges, personalized recommendations, and comparison history."
              : mode === "signup"
              ? "Register with your email to unlock shortlisting and historical recommendation storage."
              : "Administrative console for dataset verification and platform telemetry."}
          </p>
        </div>

        {/* Active Session Card */}
        {currentAuth.role !== "guest" && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5 mb-6 dark:border-indigo-950 dark:bg-indigo-950/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                {currentAuth.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {currentAuth.name}
                </div>
                <div className="text-[10px] text-slate-500 capitalize">
                  Logged in ({currentAuth.role})
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-sm"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                title="Sign out of your account"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Auth Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 mb-6">
            <button
              type="button"
              onClick={() => { setMode("signin"); setErrorMsg(null); }}
              className={`py-1.5 rounded-md text-xs font-semibold transition-all ${
                mode === "signin"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setErrorMsg(null); }}
              className={`py-1.5 rounded-md text-xs font-semibold transition-all ${
                mode === "signup"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => { setMode("admin"); setErrorMsg(null); }}
              className={`py-1.5 rounded-md text-xs font-semibold transition-all ${
                mode === "admin"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Admin
            </button>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          {mode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-500">Don&apos;t have an account yet? </span>
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setErrorMsg(null); }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  Create Account
                </button>
              </div>
            </form>
          )}

          {/* SIGN UP / REGISTER FORM */}
          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Create Password (min 6 characters)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>Register Student Account</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-500">Already have an account? </span>
                <button
                  type="button"
                  onClick={() => { setMode("signin"); setErrorMsg(null); }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {/* ADMIN LOGIN */}
          {mode === "admin" && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Administrator Secret Key
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    placeholder="Enter admin secret key..."
                    className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400">
                Default local administrator key: <code className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">admin_secret_key_123</code>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Verify Admin Key</span>
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>}>
      <LoginContent />
    </Suspense>
  );
}

