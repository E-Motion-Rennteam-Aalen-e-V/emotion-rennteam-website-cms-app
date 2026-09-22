import LoginForm from "@/components/admin/LoginForm";

export default function AdminLoginPage() {
  return (
    <main className="admin-glass relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="admin-glass__ambient" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, var(--foreground) 0px, var(--foreground) 1px, transparent 1px, transparent 64px)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-1/3 left-1/2 h-[70vh] w-[70vh] -translate-x-1/2 rounded-full bg-[var(--glass-1)]/10 blur-[140px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-1/3 right-1/4 h-[50vh] w-[50vh] rounded-full bg-[var(--glass-2)]/10 blur-[140px]"
        aria-hidden
      />
      <LoginForm />
    </main>
  );
}
