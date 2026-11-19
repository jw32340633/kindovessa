"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "../../public/favicons/logo";

export default function LoginPage() {
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
  }>({});
  const [notice, setNotice] = useState("");
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    const data = new FormData(event.currentTarget);
    const next = {
      username: String(data.get("username") ?? "").trim()
        ? undefined
        : "Enter your username.",
      password: String(data.get("password") ?? "")
        ? undefined
        : "Enter your password.",
    };
    setErrors(next);
    if (next.username) usernameRef.current?.focus();
    else if (next.password) passwordRef.current?.focus();
    else
      setNotice(
        "Sign-in is not connected yet. Authentication will be available once the backend is connected.",
      );
  }

  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-background px-4 py-10 sm:px-6">
      <div className="w-full max-w-110">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo className=" font-logo text-[2rem] sm:text-4xl" />
          <span className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Administration
          </span>
        </div>
        <Card className="gap-7 rounded-2xl py-7 shadow-[0_12px_48px_-16px_rgb(0_0_0/0.14)] [--card-spacing:--spacing(6)] sm:py-8 sm:[--card-spacing:--spacing(8)]">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/5 text-primary">
              <LockKeyhole
                className="size-7"
                strokeWidth={2}
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-normal tracking-tight sm:text-[1.75rem]">
                Welcome Back
              </h1>
            </div>
          </CardHeader>
          <CardContent>
            <form noValidate onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  ref={usernameRef}
                  id="username"
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  placeholder="Enter your username"
                  aria-invalid={!!errors.username}
                  aria-describedby={
                    errors.username ? "username-error" : undefined
                  }
                  onChange={() => {
                    setErrors((old) => ({ ...old, username: undefined }));
                    setNotice("");
                  }}
                  className="h-12 bg-card px-3.5 text-base md:text-base"
                />
                {errors.username && (
                  <p
                    id="username-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {errors.username}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    ref={passwordRef}
                    id="password"
                    name="password"
                    type={visible ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder="Enter your password"
                    aria-invalid={!!errors.password}
                    aria-describedby={
                      errors.password ? "password-error" : undefined
                    }
                    onChange={() => {
                      setErrors((old) => ({ ...old, password: undefined }));
                      setNotice("");
                    }}
                    className="h-12 bg-card pr-12 pl-3.5 text-base md:text-base"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setVisible((old) => !old)}
                    aria-label={visible ? "Hide password" : "Show password"}
                    aria-pressed={visible}
                    className="absolute top-1 right-1 size-10 text-muted-foreground"
                  >
                    {visible ? (
                      <EyeOff aria-hidden="true" />
                    ) : (
                      <Eye aria-hidden="true" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p
                    id="password-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {errors.password}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="h-12 w-full gap-2 text-sm font-semibold hover:bg-primary-hover"
              >
                Sign in <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              {notice && (
                <p
                  role="status"
                  className="rounded-lg border border-border bg-muted p-3 text-sm"
                >
                  {notice}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
