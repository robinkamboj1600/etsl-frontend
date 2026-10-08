import * as React from "react";

import logo from "@/assets/logo.png";
import { useAuth } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function LoginScreen() {
  const { login, error } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch {
      // error is already surfaced via useAuth().error
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050a1e] px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6">
          <div className="mb-6 flex flex-col items-center gap-3">
            <img src={logo} alt="Empire Trade Solutions" className="h-12 w-12 rounded-xl" />
            <div className="text-center">
              <h1 className="font-display text-base font-bold">Empire Trade Solutions</h1>
              <p className="mt-1 text-xs text-muted-foreground">Sign in to the backend dashboard.</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <Button type="submit" className="w-full" loading={busy}>
              Sign in
            </Button>
          </form>

          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            No account yet, or forgot your password? Ask an admin — accounts and passwords are
            managed from the Access panel.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
