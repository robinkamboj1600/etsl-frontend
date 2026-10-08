import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { adminUsersApi } from "@/api/adminUsers";
import { HttpError } from "@/api/http";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ROLES = [
  { value: "lead", label: "CS lead" },
  { value: "agent", label: "CS agent" },
  { value: "checker", label: "Sheet checker" },
  { value: "paypal", label: "PayPal (Lots)" },
  { value: "cj", label: "CJ · supplier" },
  { value: "dayone", label: "DayOne · supplier" },
];

const TEAMS = ["Team 1", "Team 2", "Team 3"];

const AVATAR_COLORS = ["#2536cf", "#5b3ea8", "#1d6b8c", "#2f9a76", "#a72620", "#8a5a09"];

const roleLabel = (role) => ROLES.find((r) => r.value === role)?.label || role;
const takesTeam = (role) => role === "lead" || role === "agent" || role === "checker";
const colorFor = (email) => {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

function PersonAvatar({ name, email, large }) {
  return (
    <span
      style={{ background: colorFor(email) }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        large ? "h-9 w-9 text-sm" : "h-7 w-7 text-xs",
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function EmptyDraft() {
  return { email: "", name: "", password: "", role: "agent", team: "", isAdmin: false };
}

export function Access() {
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const [addOpen, setAddOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(EmptyDraft);
  const [saving, setSaving] = React.useState(false);

  const [resetTarget, setResetTarget] = React.useState(null);
  const [resetPassword, setResetPassword] = React.useState("");
  const [resetting, setResetting] = React.useState(false);

  const [tokenTarget, setTokenTarget] = React.useState(null);
  const [tokenValue, setTokenValue] = React.useState("");
  const [savingToken, setSavingToken] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminUsersApi.list();
      setUsers(res.users);
    } catch (err) {
      toast.error(err instanceof HttpError ? err.detail || err.code : "Could not load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const createUser = async () => {
    if (!draft.email.trim() || !draft.name.trim() || draft.password.length < 8) {
      toast.error("Name, email and an 8+ character password are required.");
      return;
    }
    setSaving(true);
    try {
      const supplierOrg = draft.role === "cj" ? "CJ" : draft.role === "dayone" ? "DayOne" : undefined;
      await adminUsersApi.create({
        email: draft.email.trim(),
        name: draft.name.trim(),
        password: draft.password,
        role: draft.role,
        team: takesTeam(draft.role) && draft.team ? draft.team : undefined,
        supplierOrg,
        isAdmin: draft.isAdmin,
      });
      toast(`${draft.name.trim()} can now sign in with that email and password.`);
      setDraft(EmptyDraft());
      setAddOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof HttpError ? err.detail || err.code : "Could not create the user.");
    } finally {
      setSaving(false);
    }
  };

  const [rowBusy, setRowBusy] = React.useState(null);

  const toggleActive = async (u) => {
    setRowBusy(`${u.id}:active`);
    try {
      await adminUsersApi.update(u.id, { isActive: !u.isActive });
      toast(u.isActive ? `${u.name}'s access revoked.` : `${u.name}'s access restored.`);
      load();
    } catch (err) {
      toast.error(err instanceof HttpError ? err.detail || err.code : "Could not update the user.");
    } finally {
      setRowBusy(null);
    }
  };

  const saveToken = async (remove) => {
    if (!remove && tokenValue.trim().length < 8) {
      toast.error("Paste the full token.");
      return;
    }
    setSavingToken(remove ? "remove" : "save");
    try {
      await adminUsersApi.setQueueToken(tokenTarget.id, remove ? null : tokenValue.trim());
      toast(remove ? `Task token removed for ${tokenTarget.name}.` : `Task token saved for ${tokenTarget.name}.`);
      setTokenTarget(null);
      setTokenValue("");
      load();
    } catch (err) {
      toast.error(err instanceof HttpError ? err.detail || err.code : "Could not save the token.");
    } finally {
      setSavingToken(false);
    }
  };

  const toggleAdmin = async (u) => {
    setRowBusy(`${u.id}:admin`);
    try {
      await adminUsersApi.update(u.id, { isAdmin: !u.isAdmin });
      toast(u.isAdmin ? `${u.name} is no longer an admin.` : `${u.name} is now an admin.`);
      load();
    } catch (err) {
      toast.error(err instanceof HttpError ? err.detail || err.code : "Could not change admin access.");
    } finally {
      setRowBusy(null);
    }
  };

  const submitReset = async () => {
    if (resetPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setResetting(true);
    try {
      await adminUsersApi.update(resetTarget.id, { password: resetPassword });
      toast(`Password reset for ${resetTarget.name}.`);
      setResetTarget(null);
      setResetPassword("");
    } catch (err) {
      toast.error(err instanceof HttpError ? err.detail || err.code : "Could not reset the password.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="border-dashed bg-muted/30">
        <CardContent className="p-4 text-xs leading-relaxed text-muted-foreground">
          Everyone signs in with their own email and password — there is no self-signup, an admin
          creates the account (and its password) here first. A supplier is an organisation: anyone
          with a CJ account sees every case for a store where CJ is the supplier.
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b py-3.5">
          <CardTitle className="text-sm font-semibold">
            Team members
            <span className="ml-2 font-normal text-muted-foreground">({users.length})</span>
          </CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setDraft(EmptyDraft());
              setAddOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add person
          </Button>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person</TableHead>
              <TableHead>Team / org</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!loading && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                  No users yet.
                </TableCell>
              </TableRow>
            )}
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <PersonAvatar name={u.name} email={u.email} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">{u.name}</span>
                        {u.isAdmin && (
                          <Badge variant="brand" className="px-1.5 py-0 text-[10px]">
                            Admin
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                      {["lead", "agent", "checker"].includes(u.role) && (
                        <span className="ml-2 text-[10px] text-muted-foreground">
                          {u.hasQueueToken ? "Re:amaze token set" : "no Re:amaze token"}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {u.supplierOrg ? (
                    <Badge variant="warn">{u.supplierOrg}</Badge>
                  ) : u.team ? (
                    <Badge variant="secondary">{u.team}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">{roleLabel(u.role)}</TableCell>
                <TableCell>
                  <Badge variant={u.isActive ? "good" : "crit"}>
                    {u.isActive ? "Active" : "Revoked"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1.5">
                    {u.role === "lead" && (
                      <Button variant="outline" size="xs" loading={rowBusy === `${u.id}:admin`} onClick={() => toggleAdmin(u)}>
                        {u.isAdmin ? "Remove admin" : "Make admin"}
                      </Button>
                    )}
                    {["lead", "agent", "checker"].includes(u.role) && (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          setTokenTarget(u);
                          setTokenValue("");
                        }}
                      >
                        Task token
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => {
                        setResetTarget(u);
                        setResetPassword("");
                      }}
                    >
                      Reset password
                    </Button>
                    <Button
                      variant={u.isActive ? "outline" : "default"}
                      size="xs"
                      loading={rowBusy === `${u.id}:active`}
                      onClick={() => toggleActive(u)}
                    >
                      {u.isActive ? "Revoke" : "Restore"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password{resetTarget ? ` for ${resetTarget.name}` : ""}</DialogTitle>
            <DialogDescription>
              They will need this new password next time they sign in — nothing is emailed to them.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="reset-password">New password</Label>
            <Input
              id="reset-password"
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="Min 8 characters"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>
              Cancel
            </Button>
            <Button onClick={submitReset} loading={resetting}>
              Set password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!tokenTarget} onOpenChange={(open) => !open && setTokenTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re:amaze task token{tokenTarget ? ` for ${tokenTarget.name}` : ""}</DialogTitle>
            <DialogDescription>
              The task service knows each person by their own token, so what they do there carries their name. Paste
              the token you were given for them. It is stored encrypted and is never shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="queue-token">Token</Label>
            <Input
              id="queue-token"
              type="password"
              autoComplete="off"
              value={tokenValue}
              onChange={(e) => setTokenValue(e.target.value)}
              placeholder={tokenTarget?.hasQueueToken ? "A token is set — paste a new one to replace it" : "Paste the token"}
            />
          </div>
          <DialogFooter>
            {tokenTarget?.hasQueueToken && (
              <Button variant="outline" onClick={() => saveToken(true)} disabled={!!savingToken} loading={savingToken === "remove"}>
                Remove token
              </Button>
            )}
            <Button variant="ghost" onClick={() => setTokenTarget(null)}>
              Cancel
            </Button>
            <Button onClick={() => saveToken(false)} disabled={!!savingToken} loading={savingToken === "save"}>
              Save token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add someone</DialogTitle>
            <DialogDescription>
              They can sign in with this email and password right away — no invite email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-name">Full name</Label>
              <Input
                id="new-name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Jane Doe"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                placeholder="name@company.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Password</Label>
              <Input
                id="new-password"
                type="password"
                value={draft.password}
                onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
                placeholder="Min 8 characters"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={draft.role} onValueChange={(role) => setDraft((d) => ({ ...d, role, team: "" }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Team</Label>
                <Select
                  value={draft.team || undefined}
                  onValueChange={(team) => setDraft((d) => ({ ...d, team }))}
                  disabled={!takesTeam(draft.role)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={takesTeam(draft.role) ? "Pick a team" : "N/A"} />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAMS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createUser} loading={saving}>
              Add person
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
