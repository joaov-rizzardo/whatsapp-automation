"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, Smartphone, QrCode } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  connectInputSchema,
  type Connection,
  type ConnectInput,
} from "@/features/whatsapp/schemas/connectionSchema";

type Props = {
  connection: Connection;
  onConnect: (input: ConnectInput) => void;
  onDisconnect: () => void;
  isBusy: boolean;
};

/**
 * Purely visual. It renders whatever `connection` says and calls the callbacks;
 * the data logic lives in useWhatsappConnection. Local state here is form/view
 * state only — which method the user is choosing and the typed phone number.
 */
export function WhatsappConnectionCard({
  connection,
  onConnect,
  onDisconnect,
  isBusy,
}: Props) {
  const status = connection?.status ?? null;

  if (status === "open") {
    return (
      <CardShell
        title="WhatsApp conectado"
        description="Seu número está pronto para automatizar conversas."
        badge={<Badge className="bg-success text-white">Conectado</Badge>}
      >
        <div className="flex flex-col gap-4">
          {connection?.phoneNumber ? (
            <p className="text-sm text-muted-foreground">
              Número conectado:{" "}
              <span className="font-medium text-foreground">
                +{connection.phoneNumber}
              </span>
            </p>
          ) : null}
          <Button
            variant="destructive"
            onClick={onDisconnect}
            disabled={isBusy}
            className="w-fit"
          >
            {isBusy ? <Loader2 className="size-4 animate-spin" /> : null}
            Desconectar
          </Button>
        </div>
      </CardShell>
    );
  }

  // Not open: connecting, close, or never connected — all share the connect UI.
  return (
    <ConnectPanel
      connection={connection}
      onConnect={onConnect}
      isBusy={isBusy}
    />
  );
}

function ConnectPanel({
  connection,
  onConnect,
  isBusy,
}: {
  connection: Connection;
  onConnect: (input: ConnectInput) => void;
  isBusy: boolean;
}) {
  // Reflect the method already in progress; default to QR otherwise.
  const [mode, setMode] = useState<"qrcode" | "pairing">(
    connection?.method ?? "qrcode",
  );
  const [phone, setPhone] = useState("+55 ");
  const [error, setError] = useState<string | null>(null);

  const isConnecting = connection?.status === "connecting";

  function submit() {
    setError(null);
    const input =
      mode === "qrcode"
        ? { method: "qrcode" as const }
        : { method: "pairing" as const, phoneNumber: phone };
    const parsed = connectInputSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }
    onConnect(parsed.data);
  }

  return (
    <CardShell
      title="Conecte seu WhatsApp"
      description="Escaneie o QR Code ou use o código de pareamento no aparelho do número."
      badge={
        isConnecting ? (
          <Badge className="bg-warning text-white">Aguardando…</Badge>
        ) : (
          <Badge variant="secondary">Desconectado</Badge>
        )
      }
    >
      <div className="flex flex-col gap-6">
        {isConnecting && mode === "qrcode" && connection?.qrCode ? (
          <QrView qrCode={connection.qrCode} />
        ) : null}

        {isConnecting && mode === "pairing" && connection?.pairingCode ? (
          <PairingView code={connection.pairingCode} />
        ) : null}

        {mode === "pairing" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="wa-phone">Número com DDI</Label>
            <Input
              id="wa-phone"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+55 11 99999-8888"
            />
            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={submit} disabled={isBusy}>
            {isBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : mode === "qrcode" ? (
              <QrCode className="size-4" />
            ) : (
              <Smartphone className="size-4" />
            )}
            {mode === "qrcode" ? "Gerar QR Code" : "Gerar código"}
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              setError(null);
              setMode(mode === "qrcode" ? "pairing" : "qrcode");
            }}
            disabled={isBusy}
          >
            {mode === "qrcode"
              ? "Conectar usando o número deste celular"
              : "Voltar ao QR Code"}
          </Button>
        </div>
      </div>
    </CardShell>
  );
}

function QrView({ qrCode }: { qrCode: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
        {/* Data URI from Evolution; unoptimized because it isn't a real remote asset. */}
        <Image
          src={qrCode}
          alt="QR Code para conectar o WhatsApp"
          width={220}
          height={220}
          unoptimized
          className="size-[220px]"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Abra o WhatsApp → Aparelhos conectados → Conectar um aparelho.
      </p>
    </div>
  );
}

function PairingView({ code }: { code: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-xl border border-border bg-brand-subtle px-6 py-4">
        <span className="font-mono text-3xl font-semibold tracking-[0.3em] text-[var(--purple-700)]">
          {code.substring(0, 4) + "-" + code.substring(4, 8)}
        </span>
      </div>
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        No celular do número: WhatsApp → Aparelhos conectados → Conectar com
        número → digite o código acima.
      </p>
    </div>
  );
}

function CardShell({
  title,
  description,
  badge,
  children,
}: {
  title: string;
  description: string;
  badge: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-brand-subtle text-[var(--purple-700)]">
            <Smartphone className="size-5" />
          </div>
          {badge}
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
