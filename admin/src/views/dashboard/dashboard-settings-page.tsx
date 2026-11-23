"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import personIcon from "../../../public/icons/person-icon.png";
import shieldIcon from "../../../public/icons/shield-icon.png";
import toast from "react-hot-toast";
import { useAuth } from "@/providers/auth-provider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

type Values = {
  firstName: string;
  lastName: string;
  username: string;
  currentPassword: string;
  password: string;
  confirmPassword: string;
};
type Errors = Partial<Record<keyof Values, string>>;

export default function DashboardSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const submitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [baseline, setBaseline] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
  });
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<Values | null>(null);
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  function checkChanges() {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    setDirty(
      (Object.keys(baseline) as (keyof typeof baseline)[]).some(
        (key) => String(data.get(key) ?? "") !== baseline[key],
      ) ||
        ["currentPassword", "password", "confirmPassword"].some(
          (key) => !!data.get(key),
        ),
    );
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !dirty) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const values = Object.fromEntries(
      [
        "firstName",
        "lastName",
        "username",
        "currentPassword",
        "password",
        "confirmPassword",
      ].map((key) => [key, String(data.get(key) ?? "")]),
    ) as Values;
    values.firstName = values.firstName.trim();
    values.lastName = values.lastName.trim();
    values.username = values.username.trim().toLowerCase();
    const next: Errors = {};
    if (!values.firstName || values.firstName.length > 80)
      next.firstName = "Enter a first name of up to 80 characters.";
    if (!values.lastName || values.lastName.length > 80)
      next.lastName = "Enter a last name of up to 80 characters.";
    if (!/^[a-z0-9_]{3,40}$/.test(values.username))
      next.username = "Use 3-40 letters, numbers, or underscores.";
    if (!values.currentPassword)
      next.currentPassword = "Enter your current password to save changes.";
    if (
      values.password &&
      (values.password.length < 12 || values.password.length > 128)
    )
      next.password = "Use 12-128 characters.";
    if (values.password && values.password === values.currentPassword)
      next.password = "Choose a different password.";
    if (values.password !== values.confirmPassword)
      next.confirmPassword = "Passwords must match.";
    setErrors(next);
    if (Object.keys(next).length) {
      form
        .querySelector<HTMLInputElement>(`[name="${Object.keys(next)[0]}"]`)
        ?.focus();
      return;
    }
    setPending(values);
  }

  async function confirmSave() {
    const values = pending;
    const form = formRef.current;
    if (!values || !form || submitting.current) return;
    setPending(null);
    submitting.current = true;
    setSaving(true);
    try {
      const response = await fetch("/api/auth/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (response.status === 401) {
        toast.error("Your session expired. Please sign in again.");
        window.location.replace("/");
        return;
      }
      if (!response.ok) {
        const fields: Errors = {};
        for (const key of Object.keys(values) as (keyof Values)[])
          if (result.error?.fields?.[key]?.[0])
            fields[key] = result.error.fields[key][0];
        setErrors(fields);
        form
          .querySelector<HTMLInputElement>(`[name="${Object.keys(fields)[0]}"]`)
          ?.focus();
        throw new Error(result.error?.message ?? "Unable to save settings.");
      }
      if (result.requiresLogin) {
        toast.success("Credentials updated. Please sign in again.");
        window.location.replace("/");
        return;
      }
      for (const name of ["firstName", "lastName", "username"]) {
        const input = form.elements.namedItem(name) as HTMLInputElement;
        input.value = result.user[name];
      }
      for (const name of ["currentPassword", "password", "confirmPassword"]) {
        const input = form.elements.namedItem(name) as HTMLInputElement;
        input.value = "";
      }
      toast.success("Settings saved.");
      setBaseline({
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        username: result.user.username,
      });
      setDirty(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save settings. Please try again.",
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  function field(
    name: keyof Values,
    label: string,
    options: {
      password?: boolean;
      defaultValue?: string;
      hint?: string;
      required?: boolean;
    } = {},
  ) {
    return (
      <div className="min-w-0 space-y-2">
        <Label htmlFor={name}>{label}</Label>
        <Input
          id={name}
          name={name}
          defaultValue={options.defaultValue}
          type={options.password && !visible ? "password" : "text"}
          maxLength={options.password ? 128 : name === "username" ? 40 : 80}
          autoComplete={
            name === "currentPassword"
              ? "current-password"
              : options.password
                ? "new-password"
                : name === "firstName"
                  ? "given-name"
                  : name === "lastName"
                    ? "family-name"
                    : "username"
          }
          autoCapitalize={name === "username" ? "none" : undefined}
          spellCheck={name === "username" ? false : undefined}
          required={options.required}
          disabled={saving}
          aria-invalid={!!errors[name]}
          aria-describedby={
            errors[name]
              ? `${name}-error`
              : options.hint
                ? `${name}-hint`
                : undefined
          }
          onChange={() =>
            setErrors((previous) => ({ ...previous, [name]: undefined }))
          }
          className="h-12 bg-card text-base md:text-base"
        />
        {options.hint && (
          <p id={`${name}-hint`} className="text-xs text-muted-foreground">
            {options.hint}
          </p>
        )}
        {errors[name] && (
          <p
            id={`${name}-error`}
            role="alert"
            className="text-sm text-destructive"
          >
            {errors[name]}
          </p>
        )}
      </div>
    );
  }

  return (
    <main className="dashboard-layout">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">
            Account settings
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your admin profile and sign-in details.
          </p>
        </div>
        <Button
          type="submit"
          form="admin-settings"
          disabled={saving || !dirty}
          aria-busy={saving}
          className="h-12 w-full shrink-0 gap-2 px-6 sm:w-auto rounded-none"
          style={{
            boxShadow:
              "rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px",
          }}
        >
          {saving ? (
            <>
              Saving <Spinner aria-hidden="true" />
            </>
          ) : (
            <>Save Settings</>
          )}
        </Button>
      </div>
      <Separator className={"w-full h-0.5"} />
      <form
        id="admin-settings"
        ref={formRef}
        onSubmit={save}
        onChange={checkChanges}
        noValidate
        className="mt-2 grid w-full min-w-0 items-start gap-6 md:mt-3 lg:grid-cols-2"
      >
        <Card className="gap-6 py-6 [--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]">
          <CardHeader>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Image
                src={personIcon}
                alt=""
                width={24}
                height={24}
                className="size-6 shrink-0 object-contain"
              />
              Profile
            </h2>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {field("firstName", "First name", {
                defaultValue: user.firstName,
                required: true,
              })}
              {field("lastName", "Last name", {
                defaultValue: user.lastName,
                required: true,
              })}
            </div>
            {field("username", "Username", {
              defaultValue: user.username,
              required: true,
              hint: "3-40 letters, numbers, or underscores. Usernames are case-insensitive.",
            })}
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                value={user.email}
                disabled
                className="h-12 bg-muted text-base md:text-base"
              />
            </div>
          </CardContent>
        </Card>
        <Card className="gap-6 py-6 [--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Image
                  src={shieldIcon}
                  alt=""
                  width={24}
                  height={24}
                  className="size-6 shrink-0 object-contain"
                />
                Security
              </h2>
              <Button
                type="button"
                onClick={() => setVisible((previous) => !previous)}
                aria-pressed={visible}
                disabled={saving}
                className="min-h-11 gap-2 rounded-none bg-black px-4 text-white hover:bg-black/85"
                style={{
                  boxShadow:
                    "rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px",
                }}
              >
                {visible ? (
                  <EyeOff aria-hidden="true" />
                ) : (
                  <Eye aria-hidden="true" />
                )}
                {visible ? "Hide passwords" : "Show passwords"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {field("currentPassword", "Current password", {
              password: true,
              required: true,
              hint: "Required to confirm changes to your account.",
            })}
            <Separator />
            <div className="grid gap-5 sm:grid-cols-2">
              {field("password", "New password", {
                password: true,
                hint: "Use at least 12 characters. Choose a long, unique passphrase.",
              })}
              {field("confirmPassword", "Confirm new password", {
                password: true,
              })}
            </div>
            <p className="border-t border-border pt-4 text-sm italic leading-relaxed text-muted-foreground">
              Leave the new password fields empty to keep your password.
              Changing your username or password signs out all sessions. Sign in
              again with your updated credentials.
            </p>
          </CardContent>
        </Card>
      </form>
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent className="max-w-[calc(100vw-2rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Save account changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save these changes?{" "}
              {pending &&
              (pending.password || pending.username !== baseline.username)
                ? "Changing your credentials will sign out all sessions. You will need to sign in again."
                : "Your profile will be updated immediately."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">
              No, keep editing
            </AlertDialogCancel>
            <Button
              type="button"
              onClick={() => void confirmSave()}
              className="min-h-11"
            >
              Yes, save changes
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
