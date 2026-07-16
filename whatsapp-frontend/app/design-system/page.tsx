import { Plus, Search, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tag } from "@/components/ui/tag";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-4xl font-extrabold">ZapBot</h1>
        <p className="text-lg text-muted-foreground">
          Design system sobre shadcn/ui — página de verificação visual.
        </p>
      </header>

      <Section title="Botões">
        <div className="flex flex-wrap items-center gap-3">
          <Button>
            <Plus />
            Criar fluxo
          </Button>
          <Button variant="secondary">Cancelar</Button>
          <Button variant="ghost">Ver detalhes</Button>
          <Button variant="destructive">
            <Trash2 />
            Excluir automação
          </Button>
          <Button variant="link">Saiba mais</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Pequeno</Button>
          <Button size="default">Médio</Button>
          <Button size="lg">Grande</Button>
          <Button size="icon" variant="secondary" aria-label="Buscar">
            <Search />
          </Button>
          <Button disabled>Desabilitado</Button>
        </div>
      </Section>

      <Section title="Status">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="success" dot>
            Ativo
          </Badge>
          <Badge variant="warning" dot>
            Pendente
          </Badge>
          <Badge variant="danger" dot>
            Erro
          </Badge>
          <Badge variant="info">Rascunho</Badge>
          <Badge variant="brand">Novo</Badge>
          <Badge>1.284 envios</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Tag>Cliente VIP</Tag>
          <Tag>Lead frio</Tag>
        </div>
      </Section>

      <Section title="Superfícies">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Automações ativas</CardTitle>
              <CardDescription>Nos últimos 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-4xl font-extrabold">124</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Mensagens enviadas</CardTitle>
              <CardDescription>Nos últimos 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-4xl font-extrabold">8.472</p>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Formulários">
        <div className="flex max-w-sm flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="flow-name">Nome do fluxo</Label>
            <Input id="flow-name" placeholder="Ex: Boas-vindas" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Número</Label>
            <Input id="phone" aria-invalid placeholder="(11) 90000-0000" />
            <span className="text-sm text-destructive">Formato inválido</span>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="channel">Canal</Label>
            <Select>
              <SelectTrigger id="channel">
                <SelectValue placeholder="Selecione um canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox id="notify" />
            <Label htmlFor="notify">Notificar ao concluir</Label>
          </div>
          <RadioGroup defaultValue="agora" className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <RadioGroupItem value="agora" id="agora" />
              <Label htmlFor="agora">Disparar agora</Label>
            </div>
            <div className="flex items-center gap-3">
              <RadioGroupItem value="agendar" id="agendar" />
              <Label htmlFor="agendar">Agendar</Label>
            </div>
          </RadioGroup>
          <div className="flex items-center gap-3">
            <Switch id="active" defaultChecked />
            <Label htmlFor="active">Fluxo ativo</Label>
          </div>
        </div>
      </Section>

      <Section title="Navegação e feedback">
        <Tabs defaultValue="contatos">
          <TabsList>
            <TabsTrigger value="contatos">Contatos</TabsTrigger>
            <TabsTrigger value="fluxos">Fluxos</TabsTrigger>
          </TabsList>
          <TabsContent value="contatos" className="pt-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>MS</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-semibold">Maria Silva</span>
                <span className="text-sm text-muted-foreground">
                  Última mensagem há 2 h
                </span>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="fluxos" className="pt-4">
            <p className="text-muted-foreground">Você tem 3 automações pausadas.</p>
          </TabsContent>
        </Tabs>

        <div className="flex flex-wrap items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">Abrir modal</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Excluir automação</DialogTitle>
                <DialogDescription>
                  Esta ação não pode ser desfeita. O fluxo para de rodar
                  imediatamente.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="secondary">Cancelar</Button>
                <Button variant="destructive">Excluir</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost">Passe o mouse</Button>
            </TooltipTrigger>
            <TooltipContent>Dispara o fluxo manualmente</TooltipContent>
          </Tooltip>
        </div>
      </Section>
    </main>
  );
}
