"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Filter,
  FolderKanban,
  PieChart,
  Printer,
  Receipt,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Client, Milestone, Payment, PaymentTerm, Project } from "@/lib/db/schema";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { ProjectStatusBadge, MilestoneStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ReportProject = {
  project: Project;
  client: Client | null;
};

type ReportPayment = {
  payment: Payment;
  project: {
    id: string;
    name: string;
    code: string;
    currency: string;
  };
  client: {
    id: string;
    name: string;
  } | null;
};

type ReportTerm = {
  term: PaymentTerm;
  project: {
    id: string;
    name: string;
    code: string;
    currency: string;
  };
  client: {
    id: string;
    name: string;
  } | null;
};

type ReportMilestone = {
  milestone: Milestone;
  project: {
    id: string;
    name: string;
    code: string;
  };
};

export function StudioReportsDashboard({
  data,
  userName,
  userEmail,
}: {
  data: {
    projects: ReportProject[];
    payments: ReportPayment[];
    terms: ReportTerm[];
    milestones: ReportMilestone[];
    clients: Client[];
  };
  userName: string;
  userEmail: string;
}) {
  const [period, setPeriod] = useState<"all" | "this_year" | "this_quarter" | "this_month">("all");
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"financial" | "projects" | "clients" | "ledger">("financial");
  const [ledgerSearch, setLedgerSearch] = useState("");

  // Period filtering logic
  const filteredProjects = useMemo(() => {
    return data.projects.filter(({ project }) => {
      if (selectedClientId !== "all" && project.clientId !== selectedClientId) {
        return false;
      }
      if (selectedStatus !== "all" && project.status !== selectedStatus) {
        return false;
      }

      if (period === "all") return true;

      const pDate = new Date(project.startDate || project.createdAt);
      const now = new Date();

      if (period === "this_year") {
        return pDate.getFullYear() === now.getFullYear();
      }
      if (period === "this_quarter") {
        const curQuarter = Math.floor(now.getMonth() / 3);
        const pQuarter = Math.floor(pDate.getMonth() / 3);
        return pDate.getFullYear() === now.getFullYear() && curQuarter === pQuarter;
      }
      if (period === "this_month") {
        return pDate.getFullYear() === now.getFullYear() && pDate.getMonth() === now.getMonth();
      }
      return true;
    });
  }, [data.projects, period, selectedClientId, selectedStatus]);

  const activeProjectIds = useMemo(() => {
    return new Set(filteredProjects.map((p) => p.project.id));
  }, [filteredProjects]);

  const filteredPayments = useMemo(() => {
    return data.payments.filter((p) => activeProjectIds.has(p.payment.projectId));
  }, [data.payments, activeProjectIds]);

  const filteredTerms = useMemo(() => {
    return data.terms.filter((t) => activeProjectIds.has(t.term.projectId));
  }, [data.terms, activeProjectIds]);

  const filteredMilestones = useMemo(() => {
    return data.milestones.filter((m) => activeProjectIds.has(m.milestone.projectId));
  }, [data.milestones, activeProjectIds]);

  // Aggregate Metrics
  const grossContractValue = useMemo(() => {
    return filteredProjects.reduce((sum, p) => sum + p.project.totalAmount, 0);
  }, [filteredProjects]);

  const realizedCashInflow = useMemo(() => {
    return filteredPayments
      .filter((p) => p.payment.status === "verified")
      .reduce((sum, p) => sum + p.payment.amount, 0);
  }, [filteredPayments]);

  const outstandingReceivables = Math.max(0, grossContractValue - realizedCashInflow);
  const collectionRate = grossContractValue > 0 ? Math.round((realizedCashInflow / grossContractValue) * 100) : 0;
  const avgDealSize = filteredProjects.length > 0 ? Math.round(grossContractValue / filteredProjects.length) : 0;

  // Monthly Revenue Breakdown (Last 6 Months)
  const monthlyRevenue = useMemo(() => {
    const months: { label: string; amount: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthYear = d.toLocaleString("id-ID", { month: "short", year: "numeric" });
      const yearMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

      const totalForMonth = filteredPayments
        .filter((p) => p.payment.status === "verified" && p.payment.paidAt.startsWith(yearMonthKey))
        .reduce((sum, p) => sum + p.payment.amount, 0);

      months.push({
        label: monthYear,
        amount: totalForMonth,
      });
    }

    return months;
  }, [filteredPayments]);

  const maxMonthlyRevenue = useMemo(() => {
    const max = Math.max(...monthlyRevenue.map((m) => m.amount));
    return max > 0 ? max : 1;
  }, [monthlyRevenue]);

  // Client Portfolio Breakdown
  const clientRankings = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        company: string;
        projectCount: number;
        totalAmount: number;
        paidAmount: number;
        pendingAmount: number;
      }
    >();

    for (const { project, client } of filteredProjects) {
      const clientId = client?.id || "unknown";
      const clientName = client?.name || "Tanpa Klien";
      const clientCompany = client?.company || "-";

      const current = map.get(clientId) || {
        id: clientId,
        name: clientName,
        company: clientCompany,
        projectCount: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
      };

      current.projectCount += 1;
      current.totalAmount += project.totalAmount;
      map.set(clientId, current);
    }

    for (const p of filteredPayments) {
      if (p.payment.status === "verified") {
        const cId = p.client?.id || "unknown";
        const cur = map.get(cId);
        if (cur) {
          cur.paidAmount += p.payment.amount;
        }
      }
    }

    const list = Array.from(map.values()).map((c) => ({
      ...c,
      pendingAmount: Math.max(0, c.totalAmount - c.paidAmount),
      sharePercent: grossContractValue > 0 ? Math.round((c.totalAmount / grossContractValue) * 100) : 0,
    }));

    return list.sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredProjects, filteredPayments, grossContractValue]);

  // Milestone Completion Rate
  const milestoneStats = useMemo(() => {
    const total = filteredMilestones.length;
    const done = filteredMilestones.filter((m) => m.milestone.status === "done").length;
    const inProgress = filteredMilestones.filter((m) => m.milestone.status === "in_progress").length;
    const blocked = filteredMilestones.filter((m) => m.milestone.status === "blocked").length;
    const notStarted = filteredMilestones.filter((m) => m.milestone.status === "not_started").length;

    return {
      total,
      done,
      inProgress,
      blocked,
      notStarted,
      completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [filteredMilestones]);

  // Export to CSV Function
  function exportCSV() {
    const rows = [
      ["Laporan Keuangan & Piutang Studio - Desk"],
      [`Dicetak oleh: ${userName} (${userEmail})`],
      [`Tanggal Ekspor: ${new Date().toLocaleString("id-ID")}`],
      [],
      ["RINGKASAN EKSEKUTIF"],
      ["Total Nilai Kontrak Deal", grossContractValue],
      ["Total Kas Masuk Diterima", realizedCashInflow],
      ["Total Piutang Berjalan", outstandingReceivables],
      ["Rasio Kolektibilitas Kas", `${collectionRate}%`],
      ["Rata-rata Nilai Kontrak", avgDealSize],
      [],
      ["BUKU JURNAL PEMBAYARAN & TERMIN"],
      ["No. Faktur / ID", "Tanggal", "Nama Project", "Nama Klien", "Nominal (IDR)", "Metode", "Status", "Keterangan"],
    ];

    for (const p of filteredPayments) {
      rows.push([
        p.payment.invoiceNo,
        p.payment.paidAt,
        p.project.name,
        p.client?.name || "-",
        p.payment.amount.toString(),
        p.payment.method || "Transfer Bank",
        p.payment.status === "verified" ? "Terverifikasi" : p.payment.status,
        `"${(p.payment.note || "").replace(/"/g, '""')}"`,
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan-studio-desk-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Filtered Ledger Table Rows
  const searchedPayments = useMemo(() => {
    if (!ledgerSearch.trim()) return filteredPayments;
    const q = ledgerSearch.toLowerCase();
    return filteredPayments.filter(
      (p) =>
        p.payment.invoiceNo.toLowerCase().includes(q) ||
        p.project.name.toLowerCase().includes(q) ||
        (p.client?.name || "").toLowerCase().includes(q) ||
        (p.payment.method || "").toLowerCase().includes(q),
    );
  }, [filteredPayments, ledgerSearch]);

  return (
    <div className="space-y-6">
      {/* Print-Only Studio Header */}
      <div className="hidden print:block mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold">Laporan Eksekutif Studio & Piutang</h1>
        <p className="text-sm text-muted-foreground">
          Studio: {userName} ({userEmail}) · Dicetak pada {new Date().toLocaleDateString("id-ID")}
        </p>
      </div>

      {/* Top Header & Action Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BarChart3 className="size-5" />
            </span>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Laporan & Analitik Studio
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground pl-11.5">
            Laporan finansial lengkap, arus kas masuk, performa project, dan portofolio klien.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-xl font-medium shadow-2xs"
            onClick={() => window.print()}
          >
            <Printer className="size-3.5" />
            <span>Cetak / PDF</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            className="h-9 gap-1.5 rounded-xl font-medium shadow-2xs bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={exportCSV}
          >
            <Download className="size-3.5" />
            <span>Ekspor CSV</span>
          </Button>
        </div>
      </div>

      {/* Comprehensive Filter Toolbar */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs print:hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Filter className="size-3.5" />
              <span>Filter:</span>
            </div>

            <NativeSelect
              aria-label="Filter Periode Waktu"
              value={period}
              onChange={(e) => setPeriod(e.target.value as typeof period)}
              className="h-8.5 rounded-lg text-xs font-medium"
            >
              <option value="all">Semua Waktu</option>
              <option value="this_year">Tahun Ini (2026)</option>
              <option value="this_quarter">Kuartal Ini</option>
              <option value="this_month">Bulan Ini</option>
            </NativeSelect>

            <NativeSelect
              aria-label="Filter Klien"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="h-8.5 rounded-lg text-xs font-medium"
            >
              <option value="all">Semua Klien ({data.clients.length})</option>
              {data.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.company ? `(${c.company})` : ""}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              aria-label="Filter Status Project"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-8.5 rounded-lg text-xs font-medium"
            >
              <option value="all">Semua Status Project</option>
              <option value="active">Sedang Aktif</option>
              <option value="completed">Selesai</option>
              <option value="on_hold">Ditunda</option>
            </NativeSelect>
          </div>

          <div className="text-xs text-muted-foreground self-end sm:self-auto font-medium">
            Menampilkan <span className="font-semibold text-foreground">{filteredProjects.length}</span> project &{" "}
            <span className="font-semibold text-foreground">{filteredPayments.length}</span> transaksi
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Card 1: Gross Value */}
        <Card className="rounded-2xl border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Total Nilai Kontrak</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderKanban className="size-3.5" />
            </span>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="font-heading text-lg sm:text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {formatMoney(grossContractValue, "IDR")}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Dari {filteredProjects.length} project yang disepakati
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Cash Realized */}
        <Card className="rounded-2xl border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Kas Masuk Diterima</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <ArrowDownRight className="size-3.5" />
            </span>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="font-heading text-lg sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatMoney(realizedCashInflow, "IDR")}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">{collectionRate}%</span> kas telah cair
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Pending Receivables */}
        <Card className="rounded-2xl border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Piutang Berjalan</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <Clock className="size-3.5" />
            </span>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="font-heading text-lg sm:text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
              {formatMoney(outstandingReceivables, "IDR")}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Menunggu termin milestone selesai
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Avg Deal Size & Velocity */}
        <Card className="rounded-2xl border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">Rata-rata Nilai Deal</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="size-3.5" />
            </span>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="font-heading text-lg sm:text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {formatMoney(avgDealSize, "IDR")}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Nilai per project (ACV)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Tabs Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-2 print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab("financial")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all",
            activeTab === "financial"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          <CreditCard className="size-3.5" />
          <span>Arus Kas & Finansial</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("projects")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all",
            activeTab === "projects"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          <FolderKanban className="size-3.5" />
          <span>Kinerja Project & Milestone</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("clients")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all",
            activeTab === "clients"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          <Users className="size-3.5" />
          <span>Portofolio Klien</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ledger")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all",
            activeTab === "ledger"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          <Receipt className="size-3.5" />
          <span>Buku Jurnal Pembayaran</span>
        </button>
      </div>

      {/* TAB 1: FINANCIAL & CASHFLOW */}
      {(activeTab === "financial" || typeof window === "undefined") && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Monthly Trend Chart */}
            <Card className="rounded-2xl border-border/80 shadow-xs lg:col-span-2">
              <CardHeader className="pb-4">
                <CardTitle className="font-heading text-base font-bold text-foreground">
                  Tren Kas Masuk 6 Bulan Terakhir
                </CardTitle>
                <CardDescription className="text-xs">
                  Penerimaan transfer pembayaran yang telah diverifikasi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex h-52 items-end gap-3 sm:gap-6 border-b border-border/60 pb-3 pt-6">
                  {monthlyRevenue.map((m) => {
                    const heightPercent = Math.max(8, Math.round((m.amount / maxMonthlyRevenue) * 100));
                    return (
                      <div key={m.label} className="group/bar flex flex-1 flex-col items-center gap-2 h-full justify-end">
                        <div className="text-[10px] font-bold text-foreground opacity-0 group-hover/bar:opacity-100 transition-opacity tabular-nums">
                          {m.amount > 0 ? `${(m.amount / 1_000_000).toFixed(1)}jt` : "0"}
                        </div>
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={cn(
                            "w-full rounded-t-xl transition-all duration-300",
                            m.amount > 0
                              ? "bg-primary hover:bg-primary/80"
                              : "bg-muted/40",
                          )}
                        />
                        <span className="font-mono text-[10px] text-muted-foreground truncate w-full text-center">
                          {m.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Penerimaan Tertinggi: <strong className="text-foreground">{formatMoney(maxMonthlyRevenue, "IDR")}</strong></span>
                  <span>Total Realisasi: <strong className="text-foreground">{formatMoney(realizedCashInflow, "IDR")}</strong></span>
                </div>
              </CardContent>
            </Card>

            {/* Pipeline Distribution */}
            <Card className="rounded-2xl border-border/80 shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="font-heading text-base font-bold text-foreground">
                  Kolektibilitas Tagihan
                </CardTitle>
                <CardDescription className="text-xs">
                  Rasio pencairan kas dari total kontrak
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Gauge bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-muted-foreground">Realisasi Kas</span>
                    <span className="font-bold text-foreground">{collectionRate}%</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted/60">
                    <div
                      style={{ width: `${collectionRate}%` }}
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    />
                  </div>
                </div>

                <div className="space-y-2.5 divide-y divide-border/60 text-xs">
                  <div className="flex items-center justify-between pt-1">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      Lunas Terverifikasi
                    </span>
                    <span className="font-bold text-foreground tabular-nums">
                      {formatMoney(realizedCashInflow, "IDR")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2.5">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="size-2 rounded-full bg-amber-500" />
                      Piutang / Belum Terbayar
                    </span>
                    <span className="font-bold text-foreground tabular-nums">
                      {formatMoney(outstandingReceivables, "IDR")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2.5">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="size-2 rounded-full bg-primary" />
                      Total Omset Kontrak
                    </span>
                    <span className="font-bold text-foreground tabular-nums">
                      {formatMoney(grossContractValue, "IDR")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: PROJECTS & MILESTONE VELOCITY */}
      {activeTab === "projects" && (
        <div className="space-y-6">
          {/* Milestone Velocity Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
              <span className="text-xs text-muted-foreground">Total Milestone</span>
              <p className="mt-1 font-heading text-2xl font-bold text-foreground">{milestoneStats.total}</p>
              <p className="text-[11px] text-muted-foreground">Di semua project aktif</p>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-xs">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Rampung Selesai</span>
              <p className="mt-1 font-heading text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {milestoneStats.done}
              </p>
              <p className="text-[11px] text-muted-foreground">{milestoneStats.completionRate}% dari target</p>
            </div>

            <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 shadow-xs">
              <span className="text-xs font-medium text-primary">Sedang Dikerjakan</span>
              <p className="mt-1 font-heading text-2xl font-bold text-primary">{milestoneStats.inProgress}</p>
              <p className="text-[11px] text-muted-foreground">Fase eksekusi aktif</p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
              <span className="text-xs text-muted-foreground">Belum Dimulai</span>
              <p className="mt-1 font-heading text-2xl font-bold text-foreground">{milestoneStats.notStarted}</p>
              <p className="text-[11px] text-muted-foreground">Fase mendatang</p>
            </div>
          </div>

          {/* Project Performance Table */}
          <Card className="rounded-2xl border-border/80 shadow-xs overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base font-bold text-foreground">
                Kinerja & Status Keuangan Project
              </CardTitle>
              <CardDescription className="text-xs">
                Rincian progress pengerjaan dan sisa tagihan per project
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-y border-border/60 bg-muted/40 font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Project & Klien</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Progress</th>
                    <th className="px-4 py-3">Nilai Deal</th>
                    <th className="px-4 py-3">Terbayar</th>
                    <th className="px-4 py-3">Sisa Piutang</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredProjects.map(({ project, client }) => {
                    const paid = filteredPayments
                      .filter((p) => p.payment.projectId === project.id && p.payment.status === "verified")
                      .reduce((sum, p) => sum + p.payment.amount, 0);
                    const pending = Math.max(0, project.totalAmount - paid);

                    return (
                      <tr key={project.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3.5">
                          <Link href={`/projects/${project.id}`} className="font-semibold text-foreground hover:underline">
                            {project.name}
                          </Link>
                          <div className="text-[11px] text-muted-foreground">
                            {client?.name ? `${client.name} · ` : ""}{project.code}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <ProjectStatusBadge status={project.status} />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-muted/60">
                              <div
                                style={{ width: `${project.progressPercent}%` }}
                                className="h-full rounded-full bg-primary"
                              />
                            </div>
                            <span className="font-semibold text-foreground">{project.progressPercent}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-foreground tabular-nums">
                          {formatMoney(project.totalAmount, project.currency)}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {formatMoney(paid, project.currency)}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                          {formatMoney(pending, project.currency)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Button asChild variant="ghost" size="sm" className="h-7 text-xs rounded-lg">
                            <Link href={`/projects/${project.id}`}>Buka</Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: CLIENT PORTFOLIO & PARETO */}
      {activeTab === "clients" && (
        <div className="space-y-6">
          <Card className="rounded-2xl border-border/80 shadow-xs overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base font-bold text-foreground">
                Kontribusi Omset per Klien (Pareto Analysis)
              </CardTitle>
              <CardDescription className="text-xs">
                Klien dengan kontribusi nilai kontrak terbesar ke studio
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-y border-border/60 bg-muted/40 font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Nama Klien</th>
                    <th className="px-4 py-3">Perusahaan / Agensi</th>
                    <th className="px-4 py-3">Jumlah Proyek</th>
                    <th className="px-4 py-3">Share Omset</th>
                    <th className="px-4 py-3">Total Kontrak</th>
                    <th className="px-4 py-3">Kas Diterima</th>
                    <th className="px-4 py-3">Sisa Piutang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {clientRankings.map((c, index) => (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                            {index + 1}
                          </span>
                          {c.id !== "unknown" ? (
                            <Link href={`/clients/${c.id}`} className="hover:underline">
                              {c.name}
                            </Link>
                          ) : (
                            c.name
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">{c.company}</td>
                      <td className="px-4 py-3.5 font-medium">{c.projectCount} project</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                            <div style={{ width: `${c.sharePercent}%` }} className="h-full bg-primary" />
                          </div>
                          <span className="font-semibold text-foreground">{c.sharePercent}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-foreground tabular-nums">
                        {formatMoney(c.totalAmount, "IDR")}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatMoney(c.paidAmount, "IDR")}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                        {formatMoney(c.pendingAmount, "IDR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: TRANSACTION LEDGER */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          <Card className="rounded-2xl border-border/80 shadow-xs overflow-hidden">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
              <div>
                <CardTitle className="font-heading text-base font-bold text-foreground">
                  Jurnal Transaksi Pembayaran
                </CardTitle>
                <CardDescription className="text-xs">
                  Semua transaksi transfer dana yang tercatat dalam sistem
                </CardDescription>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari invoice, klien..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="h-8.5 pl-8 text-xs rounded-xl"
                />
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-y border-border/60 bg-muted/40 font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">No. Faktur</th>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Project & Klien</th>
                    <th className="px-4 py-3">Nominal</th>
                    <th className="px-4 py-3">Metode</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Bukti / Cetak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {searchedPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        Tidak ada transaksi pembayaran yang cocok dengan filter
                      </td>
                    </tr>
                  ) : (
                    searchedPayments.map((p) => (
                      <tr key={p.payment.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-foreground">
                          {p.payment.invoiceNo}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(p.payment.paidAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{p.project.name}</div>
                          <div className="text-[11px] text-muted-foreground">{p.client?.name || "-"}</div>
                        </td>
                        <td className="px-4 py-3 font-heading font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {formatMoney(p.payment.amount, p.project.currency)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {p.payment.method || "Transfer Bank"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                              p.payment.status === "verified"
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                            )}
                          >
                            <span className="size-1.5 rounded-full bg-current" />
                            {p.payment.status === "verified" ? "Terverifikasi" : p.payment.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button asChild variant="outline" size="sm" className="h-7 text-xs rounded-lg shadow-2xs">
                            <Link href={`/projects/${p.project.id}/payments/${p.payment.id}/receipt`}>
                              Kuitansi
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
