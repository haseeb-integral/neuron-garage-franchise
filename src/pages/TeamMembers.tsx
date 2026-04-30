import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, KeyRound, UserPlus, RefreshCw } from "lucide-react";

const APP_URL = "https://neuron-garage-franchise.lovable.app";

type Role = "admin" | "manager";

interface Row {
  id: string;
  email: string;
  full_name: string | null;
  role: Role | null;
  created_at: string;
}

export default function TeamMembers() {
  const { role: currentRole, user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  // Add user dialog
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<Role>("manager");
  const [submitting, setSubmitting] = useState(false);

  // Credentials dialog (after successful create)
  const [credsOpen, setCredsOpen] = useState(false);
  const [creds, setCreds] = useState<{
    email: string;
    full_name: string | null;
    role: Role;
    temp_password: string;
  } | null>(null);

  useEffect(() => {
    document.title = "Team members · Neuron Garage";
  }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name, created_at").order("created_at", { ascending: true }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const roleByUser = new Map<string, Role>();
    (roles ?? []).forEach((r: any) => {
      // Prefer admin if user has both
      const existing = roleByUser.get(r.user_id);
      if (existing === "admin") return;
      roleByUser.set(r.user_id, r.role as Role);
    });
    setRows(
      (profiles ?? []).map((p: any) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        role: roleByUser.get(p.id) ?? null,
        created_at: p.created_at,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    if (currentRole === "admin") load();
  }, [currentRole]);

  if (!authLoading && currentRole !== "admin") {
    return <Navigate to="/" replace />;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: {
        email: newEmail.trim().toLowerCase(),
        full_name: newName.trim() || null,
        role: newRole,
      },
    });
    setSubmitting(false);
    if (error || (data && (data as any).error)) {
      const msg = (data as any)?.error || error?.message || "Failed to create user";
      toast.error(msg);
      return;
    }
    const result = data as {
      email: string;
      full_name: string | null;
      role: Role;
      temp_password: string;
    };
    setCreds(result);
    setOpen(false);
    setCredsOpen(true);
    setNewEmail("");
    setNewName("");
    setNewRole("manager");
    load();
  };

  const handleChangeRole = async (row: Row, next: Role) => {
    if (row.id === user?.id && row.role === "admin" && next !== "admin") {
      toast.error("You can't demote yourself");
      return;
    }
    if (next === "admin") {
      await supabase.from("user_roles").delete().eq("user_id", row.id).neq("role", "admin");
      const { error } = await supabase.from("user_roles").insert({ user_id: row.id, role: "admin" });
      if (error) return toast.error(error.message);
    } else {
      await supabase.from("user_roles").delete().eq("user_id", row.id).eq("role", "admin");
      const { error } = await supabase.from("user_roles").insert({ user_id: row.id, role: "manager" });
      if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    }
    toast.success(`Role updated to ${next}`);
    load();
  };

  const handleSendReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success(`Reset link sent to ${email}`);
  };

  const copy = async (text: string, label = "Copied") => {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const buildMessage = (c: NonNullable<typeof creds>) =>
    `Hi${c.full_name ? ` ${c.full_name}` : ""},

You've been added to the Neuron Garage Franchise Acquisition System.

Login URL: ${APP_URL}
Email: ${c.email}
Temporary password: ${c.temp_password}

Please log in and change your password using the "Forgot password?" link on the sign-in page.`;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team members</h1>
          <p className="text-sm text-muted-foreground">Manage team members and their roles.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add user
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">All users ({rows.length})</CardTitle>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.full_name || "—"}</TableCell>
                  <TableCell>{r.email}</TableCell>
                  <TableCell>
                    <Select
                      value={r.role ?? "manager"}
                      onValueChange={(v) => handleChangeRole(r, v as Role)}
                      disabled={r.id === user?.id}
                    >
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">admin</SelectItem>
                        <SelectItem value="manager">manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(r.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleSendReset(r.email)}>
                      <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                      Send reset
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No users yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add user dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>
              A temporary password is generated and shown once. You'll need to share it with the new user.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-name">Full name (optional)</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={100}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">manager</SelectItem>
                  <SelectItem value="admin">admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create user"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Credentials dialog */}
      <Dialog open={credsOpen} onOpenChange={setCredsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User created — share these credentials</DialogTitle>
            <DialogDescription>
              This password is shown <strong>once</strong>. Send it to the user via your preferred channel.
              Tell them to change it via "Forgot password?" on first login.
            </DialogDescription>
          </DialogHeader>
          {creds && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 p-2 rounded border bg-muted/40">
                <div className="text-xs">
                  <div className="text-muted-foreground">Login URL</div>
                  <div className="font-mono break-all">{APP_URL}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => copy(APP_URL, "URL copied")}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2 p-2 rounded border bg-muted/40">
                <div className="text-xs">
                  <div className="text-muted-foreground">Email</div>
                  <div className="font-mono">{creds.email}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => copy(creds.email, "Email copied")}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2 p-2 rounded border bg-muted/40">
                <div className="text-xs">
                  <div className="text-muted-foreground">Temporary password</div>
                  <div className="font-mono">{creds.temp_password}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => copy(creds.temp_password, "Password copied")}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{creds.role}</Badge>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => creds && copy(buildMessage(creds), "Message copied")}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy ready-to-send message
            </Button>
            <Button onClick={() => setCredsOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
