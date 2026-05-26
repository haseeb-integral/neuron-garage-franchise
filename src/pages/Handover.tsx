import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, ExternalLink, FileText } from "lucide-react";

const GOOGLE_DOC_PATH = "Shared with me → Neuron Garage → 00_Admin → Account Inventory";
const REPO_FILE_PATH = "docs/handover/accounts.md";

interface AccountRow {
  name: string;
  purpose: string;
  owner: string;
  samAccess: string;
  howTo: string;
}

const platforms: AccountRow[] = [
  {
    name: "💻 Lovable.dev",
    purpose: "Where this app is built, previewed, and published.",
    owner: "[see Google Doc]",
    samAccess: "Full admin (co-owner)",
    howTo: "Lovable → Project → Settings → Team → invite Sam as Admin.",
  },
  {
    name: "⚡ Lovable Cloud (backend)",
    purpose: "DB, Auth, Storage, Edge Functions. Stores all app data.",
    owner: "Managed via Lovable project",
    samAccess: "Inherited from Lovable project access",
    howTo: "Nothing extra — Lovable project access = Cloud access.",
  },
  {
    name: "🐙 GitHub",
    purpose: "Source code + version history. Repo is public.",
    owner: "haseeb-integral (personal)",
    samAccess: "Admin collaborator now; org transfer post-release",
    howTo: "Repo → Settings → Collaborators → add Sam with Admin role.",
  },
  {
    name: "🌐 Domain & DNS",
    purpose: "neurongarage.com (confirm) and DNS records.",
    owner: "[see Google Doc]",
    samAccess: "Account contact / admin",
    howTo: "Registrar dashboard → Account → Add user.",
  },
  {
    name: "📬 Google Workspace",
    purpose: "Email (*@neurongarage.com) and the shared Drive holding credentials.",
    owner: "[see Google Doc]",
    samAccess: "Super Admin",
    howTo: "admin.google.com → Admin roles → assign Super Admin.",
  },
];

const brettApis: { name: string; usedFor: string }[] = [
  { name: "SmartLead", usedFor: "Cold email outreach to teachers" },
  { name: "Apify", usedFor: "Web scraping for teacher prospects" },
  { name: "Firecrawl", usedFor: "Website crawling for enrichment" },
  { name: "Deepgram", usedFor: "TTS in the AI assistant" },
  { name: "Census API", usedFor: "Demographics data for city scoring" },
  { name: "BLS API", usedFor: "Labor statistics for city scoring" },
  { name: "BEA API", usedFor: "Economic data for city scoring" },
  { name: "Lovable AI Gateway", usedFor: "All in-app AI calls (managed by Lovable plan)" },
];

const checklist = [
  "Sam confirms his email address for all the below",
  "Add Sam to Lovable project (Admin)",
  "Add Sam to GitHub repo (Admin collaborator)",
  "Add Sam to Google Workspace (Super Admin)",
  "Add Sam as domain registrar contact",
  "Create Sam's app login at /settings/team (role: admin)",
  "Share the Google Doc with Sam (view + edit)",
  "🟡 Talk to Brett re: SmartLead + other API accounts",
  "Later (post-release): create neuron-garage GitHub org, transfer repo",
];

export default function Handover() {
  const { role, loading } = useAuth();

  useEffect(() => {
    document.title = "Credentials & Handover · Neuron Garage";
  }, []);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (role !== "admin") return <Navigate to="/" replace />;

  return (
    <div className="p-5 max-w-[1100px] mx-auto w-full space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Credentials & Handover</h1>
        <p className="text-sm text-muted-foreground">
          Index of every account this app depends on. Used to hand ownership to Sam.
        </p>
      </div>

      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Secrets do not live here</AlertTitle>
        <AlertDescription className="space-y-1">
          <div>
            This page (and the matching <code className="font-mono text-xs">{REPO_FILE_PATH}</code> file
            in our public repo) lists <strong>what accounts exist</strong> — never passwords or API keys.
          </div>
          <div>
            Actual credentials live in the shared Google Doc:{" "}
            <span className="font-medium">{GOOGLE_DOC_PATH}</span>
            <span className="text-xs ml-1 opacity-80">(adhoc path until Brett confirms final Drive)</span>
          </div>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Primary platforms & hosting (we own)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {platforms.map((p) => (
            <div key={p.name} className="border rounded-md p-3 space-y-1">
              <div className="font-semibold">{p.name}</div>
              <div className="text-sm text-muted-foreground">{p.purpose}</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                <div><span className="text-muted-foreground">Owner: </span>{p.owner}</div>
                <div><span className="text-muted-foreground">Sam access: </span>{p.samAccess}</div>
                <div><span className="text-muted-foreground">How to hand over: </span>{p.howTo}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">2. API integrations</CardTitle>
          <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50">
            🟡 Pending Brett
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            All on Brett's personal accounts. API keys are wired into Lovable Cloud secrets and
            working. Brett must decide per service: <em>transfer</em>, <em>add Sam as user</em>,
            or <em>leave on his account</em>. <strong>Do not share or transfer until Brett approves.</strong>
          </p>
          <div className="border rounded-md divide-y">
            {brettApis.map((a) => (
              <div key={a.name} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="font-medium">{a.name}</span>
                <span className="text-muted-foreground text-xs">{a.usedFor}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. App login users</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            Managed live in-app at the{" "}
            <a href="/settings/team" className="text-primary hover:underline inline-flex items-center gap-1">
              Team Members <ExternalLink className="w-3 h-3" />
            </a>{" "}
            page — that's the source of truth. Create accounts, send password resets, change roles there.
          </p>
          <p className="text-muted-foreground">
            Confirm these exist with admin role: Kaylie, Sam, Haseeb, Brett.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">4. Marketing & outreach</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div>• LinkedIn — company page + personal handles used for outreach (list in Google Doc)</div>
          <div>• Analytics — confirm if GA4 / Plausible / none</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">5. Handover checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-1.5 text-sm list-decimal pl-5">
            {checklist.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <FileText className="w-3 h-3" />
        Mirrored in repo at <code className="font-mono">{REPO_FILE_PATH}</code>
      </div>
    </div>
  );
}
