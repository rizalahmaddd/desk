"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, MessageCircle, Send, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { buildWhatsAppUrl, formatProjectProgressSummary } from "@/lib/whatsapp";
import { daysUntil, formatDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ProjectSummaryShare({
  projectName,
  progressPercent,
  currentMilestone,
  dueDate,
  clientName,
  clientPhone,
  portalUrl,
}: {
  projectName: string;
  progressPercent: number;
  currentMilestone?: string | null;
  dueDate?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  portalUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const daysLeft = daysUntil(dueDate);
  const summaryText = formatProjectProgressSummary({
    clientName,
    projectName,
    progressPercent,
    currentMilestone,
    dueDate,
    daysLeft,
    portalUrl,
  });

  const waUrl = buildWhatsAppUrl(clientPhone, summaryText);

  function copyText() {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    toast.success("Ringkasan progres berhasil disalin ke clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  function openWhatsApp() {
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-10 gap-2 rounded-xl font-medium shadow-2xs border-border/80 hover:border-primary/40 hover:bg-primary/5 transition-all"
        >
          <Sparkles className="size-4 text-primary" />
          <span className="hidden sm:inline">Bagikan Progress</span>
          <span className="sm:hidden">Share</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-lg">
            <Share2 className="size-5 text-primary" />
            <span>Bagikan Ringkasan Progres Proyek</span>
          </DialogTitle>
          <DialogDescription>
            Kirimkan format update rapi ke klien via WhatsApp atau salin ke pesan chat untuk menjaga transparansi kerja.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Card Preview */}
          <div className="relative rounded-2xl border border-border/80 bg-muted/20 p-4 font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed shadow-inner">
            {summaryText}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={copyText}
              className="gap-2 rounded-xl h-10 font-medium"
            >
              {copied ? (
                <>
                  <Check className="size-4 text-emerald-600" />
                  <span>Tersalin ke Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  <span>Salin Teks Update</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={openWhatsApp}
              className="gap-2 rounded-xl h-10 font-medium bg-[#25D366] text-white hover:bg-[#20bd5a] shadow-xs"
            >
              <MessageCircle className="size-4 fill-white text-[#25D366]" />
              <span>
                Kirim via WhatsApp
                {clientPhone ? ` (${clientName || "Klien"})` : ""}
              </span>
            </Button>
          </div>

          {portalUrl ? (
            <div className="border-t border-border/60 pt-3 text-center">
              <a
                href={portalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                <span>Lihat Tampilan Portal Klien Langsung</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
