"use client";

import { useState, useTransition } from "react";
import { Copy, Check, KeyRound, Plus, Trash2, Terminal, Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createApiKeyAction, revokeApiKeyAction } from "@/app/actions/api-keys";
import { toast } from "sonner";
import { formatDate } from "@/lib/dates";

type ApiKeyItem = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
};

export function ApiKeysManager({
  apiKeys: initialKeys,
  appUrl,
}: {
  apiKeys: ApiKeyItem[];
  appUrl: string;
}) {
  const [openCreate, setOpenCreate] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!keyName.trim()) return;

    const formData = new FormData();
    formData.append("name", keyName.trim());

    startTransition(async () => {
      const res = await createApiKeyAction(null, formData);
      if (res.success) {
        setCreatedKey(res.key);
        setKeyName("");
        toast.success("Kunci API berhasil dibuat!");
      } else {
        toast.error(res.error || "Gagal membuat kunci API.");
      }
    });
  }

  function handleRevoke(id: string, name: string) {
    if (!confirm(`Yakin ingin mencabut kunci API "${name}"? Aplikasi AI yang menggunakannya tidak akan dapat mengakses lagi.`)) {
      return;
    }

    const formData = new FormData();
    formData.append("id", id);

    startTransition(async () => {
      await revokeApiKeyAction(formData);
      toast.success(`Kunci API "${name}" telah dicabut.`);
    });
  }

  function copyToClipboard(text: string, type: "key" | string) {
    void navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedSnippet(type);
      setTimeout(() => setCopiedSnippet(null), 2000);
    }
    toast.success("Disalin ke papan klip!");
  }

  const sampleKey = createdKey || "pdk_live_your_api_key_here";

  const claudeConfig = JSON.stringify(
    {
      mcpServers: {
        projectdesk: {
          command: "npx",
          args: ["-y", "@projectdesk/mcp-server"],
          env: {
            PROJECTDESK_URL: appUrl,
            PROJECTDESK_API_KEY: sampleKey,
          },
        },
      },
    },
    null,
    2,
  );

  const cursorConfig = JSON.stringify(
    {
      mcpServers: {
        projectdesk: {
          command: "node",
          args: ["./mcp-server/dist/index.js"],
          env: {
            PROJECTDESK_URL: appUrl,
            PROJECTDESK_API_KEY: sampleKey,
          },
        },
      },
    },
    null,
    2,
  );

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-heading text-sm font-semibold text-foreground">
            Daftar Kunci API Aktif
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gunakan kunci ini pada Claude Desktop, Cursor, atau script otomasi Anda.
          </p>
        </div>

        <Dialog
          open={openCreate}
          onOpenChange={(open) => {
            setOpenCreate(open);
            if (!open) setCreatedKey(null);
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 rounded-xl h-9 font-medium shadow-xs">
              <Plus className="size-4" />
              <span>Buat API Key Baru</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="size-5 text-primary" />
                <span>Buat API Key Baru</span>
              </DialogTitle>
              <DialogDescription>
                Berikan label nama pengenal, misalnya nama aplikasi atau model AI yang akan menggunakannya.
              </DialogDescription>
            </DialogHeader>

            {createdKey ? (
              <div className="space-y-4 py-2">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-200">
                  <strong>Penting:</strong> Simpan kunci ini sekarang. Untuk alasan keamanan, kunci lengkap ini tidak akan pernah ditampilkan lagi setelah dialog ini ditutup.
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Kunci API Anda:</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={createdKey}
                      className="font-mono text-xs h-10 select-all bg-muted/60"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 h-10 w-10 rounded-lg"
                      onClick={() => copyToClipboard(createdKey, "key")}
                    >
                      {copiedKey ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    className="w-full rounded-xl"
                    onClick={() => {
                      setOpenCreate(false);
                      setCreatedKey(null);
                    }}
                  >
                    Saya Sudah Menyimpan Kunci Ini
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="keyName" className="text-xs font-semibold">
                    Label Kunci (Nama Client / AI)
                  </Label>
                  <Input
                    id="keyName"
                    placeholder="Contoh: Claude Desktop, Cursor AI, Antigravity"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    required
                    className="h-10 rounded-xl text-sm"
                  />
                </div>
                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenCreate(false)}
                    className="rounded-xl"
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={isPending} className="rounded-xl">
                    {isPending ? "Membuat..." : "Buat Kunci"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Keys List */}
      {initialKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-border/80 text-center bg-muted/20 space-y-2">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <KeyRound className="size-5" />
          </div>
          <p className="text-sm font-semibold text-foreground">Belum Ada Kunci API</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Buat kunci API pertama untuk mulai menghubungkan Desk dengan asisten AI favorit Anda.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/60 rounded-2xl border border-border/80 overflow-hidden bg-card">
          {initialKeys.map((k) => (
            <div
              key={k.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-muted/30 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-heading text-sm font-semibold text-foreground">
                    {k.name}
                  </span>
                  <code className="text-[11px] font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
                    {k.keyPrefix}
                  </code>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-3">
                  <span>Dibuat: {formatDate(k.createdAt)}</span>
                  <span>•</span>
                  <span>
                    {k.lastUsedAt
                      ? `Terakhir dipakai: ${formatDate(k.lastUsedAt)}`
                      : "Belum pernah digunakan"}
                  </span>
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive self-end sm:self-auto rounded-lg h-8 gap-1.5 text-xs"
                onClick={() => handleRevoke(k.id, k.name)}
                disabled={isPending}
              >
                <Trash2 className="size-3.5" />
                <span>Cabut</span>
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* MCP & AI Integration Guides */}
      <div className="rounded-2xl border border-border/80 bg-muted/20 p-5 space-y-4">
        <div className="flex items-center gap-2 text-foreground font-heading text-sm font-semibold">
          <Sparkles className="size-4 text-primary" />
          <span>Panduan Cepat Integrasi AI (Model Context Protocol)</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Desk menyediakan server MCP bawaan (Model Context Protocol). Salin konfigurasi di bawah ini ke file pengaturan Claude Desktop atau Cursor Anda agar AI dapat membaca dan memperbarui project secara mandiri.
        </p>

        <div className="space-y-3 pt-2">
          {/* Claude Desktop Config */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <Bot className="size-3.5 text-primary" />
                <span>Claude Desktop (`claude_desktop_config.json`)</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1.5"
                onClick={() => copyToClipboard(claudeConfig, "claude")}
              >
                {copiedSnippet === "claude" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                <span>Salin</span>
              </Button>
            </div>
            <pre className="p-3 rounded-xl bg-zinc-950 text-zinc-100 text-[11px] font-mono overflow-x-auto border border-zinc-800">
              {claudeConfig}
            </pre>
          </div>

          {/* Cursor Config */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <Bot className="size-3.5 text-primary" />
                <span>Cursor (.cursor/mcp.json)</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1.5"
                onClick={() => copyToClipboard(cursorConfig, "cursor")}
              >
                {copiedSnippet === "cursor" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                <span>Salin</span>
              </Button>
            </div>
            <pre className="p-3 rounded-xl bg-zinc-950 text-zinc-100 text-[11px] font-mono overflow-x-auto border border-zinc-800">
              {cursorConfig}
            </pre>
          </div>

          {/* Direct API Request Example */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <Terminal className="size-3.5 text-primary" />
                <span>Contoh REST API (cURL)</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1.5"
                onClick={() =>
                  copyToClipboard(
                    `curl -H "Authorization: Bearer ${sampleKey}" ${appUrl}/api/v1/projects`,
                    "curl",
                  )
                }
              >
                {copiedSnippet === "curl" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                <span>Salin</span>
              </Button>
            </div>
            <pre className="p-3 rounded-xl bg-zinc-950 text-zinc-100 text-[11px] font-mono overflow-x-auto border border-zinc-800">
              {`curl -H "Authorization: Bearer ${sampleKey}" ${appUrl}/api/v1/projects`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
