import { Logo } from "@/components/logo";
import { CheckCircle2, Sparkles, Wallet } from "lucide-react";

const highlights = [
  "Satu tautan aman untuk progres, dokumen, dan invoice.",
  "Client langsung membuka portal tanpa perlu mendaftar akun.",
  "Kalkulasi sisa tagihan dan termin pembayaran otomatis.",
];

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_0.9fr]">
      {/* Left Studio Showcase Pane */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-border/60 bg-[#0f1117] p-12 text-white lg:flex">
        {/* Subtle grid pattern without blurry glow */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px]" />

        {/* Brand Header */}
        <div className="relative z-10">
          <Logo
            size="lg"
            className="text-white [&_span:first-child]:bg-white [&_span:first-child]:text-[#0f1117]"
          />
        </div>

        {/* Central Studio Card & Manifesto */}
        <div className="relative z-10 max-w-lg space-y-8">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
              <Sparkles className="size-3.5 text-primary" />
              Ruang Kerja Studio Freelance
            </span>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold leading-tight tracking-tight text-white">
              Project rapi, client tenang, pembayaran jelas.
            </h1>
            <p className="text-base leading-relaxed text-white/70">
              Desk menyatukan progres milestone, pengiriman berkas deliverable, dan jadwal penagihan termin dalam satu portal interaktif yang dapat diakses client secara instan.
            </p>
          </div>

          {/* Miniature Studio Card Mockup */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-400" />
                <span className="font-heading text-sm font-semibold text-white">
                  Brand Identity & Web Redesign
                </span>
              </div>
              <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[11px] text-white/70">
                PRJ-01
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-white/70">
                <span>Progress Pengerjaan</span>
                <span className="font-bold text-white">80%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-4/5 rounded-full bg-primary" />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-2.5 text-xs text-white/70">
              <span className="flex items-center gap-1.5">
                <Wallet className="size-3.5 text-emerald-400" />
                Terbayar: Rp 15.000.000
              </span>
              <span className="text-white/50">4 dari 5 milestone rampung</span>
            </div>
          </div>

          {/* Bullet Benefits */}
          <ul className="space-y-3 pt-2">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-white/80">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-white/40 border-t border-white/10 pt-4">
          <span>Desk Open Source Edition</span>
          <span>Didukung oleh Cloudflare Workers & D1</span>
        </div>
      </div>

      {/* Right Form Pane */}
      <div className="flex min-h-dvh flex-col bg-background">
        <div className="flex items-center justify-between p-6 lg:hidden border-b border-border/80">
          <Logo size="sm" />
        </div>
        <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md space-y-6">
            <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
