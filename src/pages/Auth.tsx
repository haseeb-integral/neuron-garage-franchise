import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Lock, LogIn, Mail, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/neuron-garage-logo.png";

const resetSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
});

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

const signupSchema = loginSchema.extend({
  full_name: z.string().trim().max(100).optional(),
});

export default function Auth() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Sign in · Neuron Garage";
  }, []);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = resetSchema.safeParse({ email: forgotEmail });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setForgotSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Check your inbox for a password reset link.");
    setForgotOpen(false);
    setForgotEmail("");
  };

  if (!loading && session) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Invalid email or password" : error.message);
      return;
    }
    toast.success("Welcome back!");
    navigate("/", { replace: true });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse({ email, password, full_name: fullName });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName || null },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message.includes("already registered") ? "An account with this email already exists" : error.message);
      return;
    }
    toast.success("Account created! Signing you in…");
    // Auto-confirm is on, so signInWithPassword will succeed immediately
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (!signInErr) navigate("/", { replace: true });
  };

  const isLogin = tab === "login";

  return (
    <div className="min-h-screen bg-[#f5f8fc] text-[#081633]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.02fr_1fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-white via-[#f7fbff] to-[#eef5ff] px-8 py-5 lg:flex lg:flex-col lg:justify-between xl:px-12">
          <div className="pointer-events-none absolute inset-0 opacity-80">
            <div className="absolute left-12 top-60 h-[360px] w-[620px] rounded-[50%] border border-dashed border-[#8bb8ff]/40" />
            <div className="absolute left-28 top-[330px] h-[310px] w-[520px] rounded-[50%] border border-dashed border-[#8bb8ff]/30" />
            <div className="absolute bottom-20 right-0 h-64 w-64 rounded-full bg-[#dbeafe]/60 blur-3xl" />
          </div>

          <div className="relative z-10">
            <div className="mb-6 flex items-center gap-3">
              <img src={logo} alt="Neuron Garage Franchise" className="h-10 w-10 object-contain" />
              <div>
                <div className="text-xl font-black uppercase leading-5 tracking-[0.08em] text-[#081633]">Neuron</div>
                <div className="text-xl font-black uppercase leading-5 tracking-[0.08em] text-[#081633]">Garage</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.35em] text-[#2458ff]">Franchise</div>
              </div>
            </div>

            <div className="max-w-xl">
              <h1 className="text-3xl font-black leading-tight tracking-tight text-[#07142f] xl:text-[34px]">
                Grow Together.
                <br />
                Drive Success.
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-[#4d5d76]">
                Manage franchise acquisition and onboarding with insights, automation, and scale.
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-4 min-h-[260px]">
            <div className="absolute left-8 top-0 w-[280px] rounded-2xl border border-[#d9e2ef] bg-white/90 p-4 shadow-xl shadow-blue-950/5 backdrop-blur">
              <div className="mb-3 text-sm font-semibold text-[#081633]">Pipeline Snapshot</div>
              <div className="flex h-10 overflow-hidden rounded-lg">
                <div className="flex-1 bg-[#174be8]" />
                <div className="flex-1 bg-[#1f6ff2]" />
                <div className="flex-1 bg-[#248dde]" />
                <div className="flex-1 bg-[#30b8a6]" />
                <div className="flex-1 bg-[#44c77c]" />
              </div>
            </div>

            <div className="absolute left-[350px] top-28 w-44 rounded-2xl border border-[#d9e2ef] bg-white/90 p-3 shadow-xl shadow-blue-950/5 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4ff] text-[#174be8]">
                  <Users size={20} />
                </div>
                <div>
                  <div className="text-xs font-medium text-[#61708a]">Active Candidates</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-[#07142f]">128</span>
                    <span className="text-xs font-bold text-[#13a35b]">↑ 18%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute left-0 top-36 w-44 rounded-2xl border border-[#d9e2ef] bg-white/90 p-4 shadow-xl shadow-blue-950/5 backdrop-blur">
              <div className="mb-1 text-xs font-semibold text-[#61708a]">City Scoring</div>
              <div className="text-sm text-[#61708a]">Score</div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-2xl font-black text-[#07142f]">78</div>
                <div className="relative h-14 w-14 rounded-full" style={{ background: "conic-gradient(#174be8 0deg 276deg, #dbe5f1 276deg 360deg)" }}>
                  <div className="absolute inset-2 rounded-full bg-white" />
                </div>
              </div>
              <div className="mt-1 rounded-md bg-[#e7f7ed] px-2 py-1 text-xs font-bold text-[#16834a]">High</div>
            </div>

            <div className="absolute bottom-6 left-0 w-44 rounded-2xl border border-[#d9e2ef] bg-white/90 p-4 shadow-xl shadow-blue-950/5 backdrop-blur">
              <div className="mb-1 text-xs font-semibold text-[#61708a]">Growth Trend</div>
              <div className="text-sm font-bold text-[#13a35b]">↑ 18%</div>
              <TrendingUp className="mt-2 text-[#174be8]" size={72} strokeWidth={1.8} />
            </div>

            <div className="absolute bottom-0 left-48 right-0 h-[220px] rounded-t-[2rem] border border-[#d9e2ef] bg-gradient-to-br from-white to-[#dceaff] shadow-2xl shadow-blue-950/10">
              <div className="absolute bottom-0 left-10 right-10 h-44 rounded-t-2xl border border-[#c8d8ee] bg-gradient-to-br from-white via-[#eaf3ff] to-[#b9d7ff] shadow-inner">
                <div className="absolute left-0 top-12 h-20 w-full bg-[#174be8]/10" />
                <div className="absolute left-10 top-10 rounded-lg bg-white/90 px-4 py-2 text-base font-black uppercase tracking-tight text-[#174be8] shadow-sm">
                  Neuron Garage
                </div>
                <div className="absolute bottom-0 left-8 h-20 w-16 rounded-t-lg bg-[#174be8]" />
                <div className="absolute bottom-0 left-28 h-20 w-16 rounded-t-lg bg-[#2b6ef3]" />
                <div className="absolute bottom-0 right-10 h-24 w-24 rounded-t-xl bg-[#0b3f86]" />
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-3 pb-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e9f2ff] text-[#174be8]">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="font-bold text-[#07142f]">Trusted by franchise leaders nationwide.</div>
              <div className="text-sm text-[#4d5d76]">Secure. Reliable. Built for Growth.</div>
            </div>
          </div>
        </section>

        <main className="flex min-h-screen flex-col justify-between px-5 py-3 sm:px-8 lg:px-10 xl:px-14">
          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-2">
            <div className="mb-4 flex items-center justify-center gap-3 lg:hidden">
              <img src={logo} alt="Neuron Garage" className="h-9 w-9 object-contain" />
              <div className="text-xl font-black tracking-tight text-[#003c7e]">Neuron Garage</div>
            </div>

            <Card className="rounded-3xl border-[#eef2f7] bg-white/95 shadow-2xl shadow-blue-950/5">
              <CardHeader className="px-6 pb-1 pt-5 sm:px-7">
                <CardTitle className="text-2xl font-black tracking-tight text-[#07142f]">
                  {isLogin ? "Welcome Back" : "Create Account"}
                </CardTitle>
                <CardDescription className="pt-1 text-sm text-[#4d5d76]">
                  {isLogin
                    ? "Sign in to your Neuron Garage Franchise account"
                    : "Create your Neuron Garage Franchise account to get started."}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-5 pt-3 sm:px-7">
                {isLogin ? (
                  <form onSubmit={handleLogin} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="login-email" className="font-semibold text-[#07142f]">Email Address</Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7d8aa0]" />
                        <Input
                          id="login-email"
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value.trim())}
                          required
                          placeholder="Enter your email"
                          className="h-10 rounded-xl border-[#cfd9e8] pl-10 text-sm focus-visible:ring-[#174be8]"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="login-password" className="font-semibold text-[#07142f]">Password</Label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#7d8aa0]" />
                        <PasswordInput
                          id="login-password"
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          placeholder="Enter your password"
                          className="h-10 rounded-xl border-[#cfd9e8] pl-10 text-sm focus-visible:ring-[#174be8]"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <label className="flex items-center gap-2 text-[#4d5d76]">
                        <input type="checkbox" className="h-4 w-4 rounded border-[#b8c5d8] text-[#174be8]" />
                        Remember me
                      </label>
                      <button
                        type="button"
                        onClick={() => { setForgotEmail(email); setForgotOpen(true); }}
                        className="font-semibold text-[#174be8] hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Button
                      type="submit"
                      className="h-10 w-full rounded-xl bg-[#174be8] text-sm font-bold text-white shadow-lg shadow-blue-700/20 hover:bg-[#0f3fd0]"
                      disabled={submitting}
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      {submitting ? "Signing in…" : "Sign In"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleSignup} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="signup-name" className="font-semibold text-[#07142f]">Full name (optional)</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        maxLength={100}
                        placeholder="Enter your full name"
                        className="h-10 rounded-xl border-[#cfd9e8] text-sm focus-visible:ring-[#174be8]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="signup-email" className="font-semibold text-[#07142f]">Email Address</Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7d8aa0]" />
                        <Input
                          id="signup-email"
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value.trim())}
                          required
                          placeholder="Enter your email"
                          className="h-10 rounded-xl border-[#cfd9e8] pl-10 text-sm focus-visible:ring-[#174be8]"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="signup-password" className="font-semibold text-[#07142f]">Password</Label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#7d8aa0]" />
                        <PasswordInput
                          id="signup-password"
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          placeholder="Create a password"
                          className="h-10 rounded-xl border-[#cfd9e8] pl-10 text-sm focus-visible:ring-[#174be8]"
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="h-10 w-full rounded-xl bg-[#174be8] text-sm font-bold text-white shadow-lg shadow-blue-700/20 hover:bg-[#0f3fd0]"
                      disabled={submitting}
                    >
                      {submitting ? "Creating account…" : "Create Account"}
                    </Button>
                  </form>
                )}

                {isLogin && (
                  <>
                    <div className="my-4 flex items-center gap-4 text-sm text-[#7d8aa0]">
                      <div className="h-px flex-1 bg-[#dbe3ee]" />
                      <span>or continue with</span>
                      <div className="h-px flex-1 bg-[#dbe3ee]" />
                    </div>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      {[
                        { label: "Google", icon: "G" },
                        { label: "Microsoft", icon: "▦" },
                        { label: "SSO", icon: "⌂" },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          disabled
                          aria-disabled="true"
                          className="cursor-not-allowed rounded-xl border border-[#d6dfeb] bg-[#f6f8fb] px-3 py-2 text-[#7d8aa0] opacity-80"
                        >
                          <div className="flex items-center justify-center gap-2 text-sm font-semibold">
                            <span className="text-lg">{item.icon}</span>
                            {item.label}
                          </div>
                          <div className="mx-auto mt-1 w-fit rounded-full bg-[#e9eef6] px-2.5 py-0.5 text-[10px] font-medium text-[#7d8aa0]">
                            Coming soon
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="mt-3 rounded-2xl border-[#eef2f7] bg-white/95 shadow-xl shadow-blue-950/5">
              <CardContent className="px-7 py-4 text-center sm:px-9">
                <h2 className="text-base font-bold text-[#07142f]">
                  {isLogin ? "New to Neuron Garage Franchise?" : "Already have an account?"}
                </h2>
                <p className="mt-1 text-sm text-[#4d5d76]">
                  {isLogin ? "Create an account to get started." : "Sign in to continue managing your franchise pipeline."}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTab(isLogin ? "signup" : "login")}
                  className="mt-3 h-10 w-full rounded-xl border-[#cfd9e8] text-sm font-bold text-[#174be8] hover:bg-[#eef4ff] hover:text-[#0f3fd0]"
                >
                  {isLogin ? "Create Account" : "Back to Sign In"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <footer className="flex flex-col items-center justify-between gap-3 border-t border-[#dbe3ee] pt-3 text-xs text-[#65748c] sm:flex-row">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#174be8]" />
              Your data is protected with enterprise-grade security.
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span>© 2026 Neuron Garage Franchise. All rights reserved.</span>
              <span className="hidden sm:inline">•</span>
              <span>Privacy Policy</span>
              <span>•</span>
              <span>Terms of Service</span>
            </div>
          </footer>
        </main>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>
              Enter your email and we'll send you a link to set a new password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setForgotOpen(false)} disabled={forgotSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={forgotSubmitting}>
                {forgotSubmitting ? "Sending…" : "Send reset link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
