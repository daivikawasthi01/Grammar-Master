"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, Mail, ShieldAlert, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ErrorState } from "@/components/app/error-state";
import { keys, useMe, useUpdateProfile } from "@/hooks/queries";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { User } from "@/lib/types";
import { changeEmailSchema, changePasswordSchema, LANGUAGES, type ChangeEmailInput, type ChangePasswordInput, type Language } from "@/shared/schemas";

export function Settings() {
  const me = useMe();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
      <p className="text-sm text-muted-foreground">Account</p>
      <h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-4xl">Settings</h1>
      <div className="mt-8 space-y-6">
        {me.isLoading ? (
          <>
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </>
        ) : me.isError ? (
          <ErrorState error={me.error} onRetry={() => me.refetch()} />
        ) : (
          <>
            <Profile user={me.data!.user} />
            <UsageCard used={me.data!.usage.used} limit={me.data!.usage.limit} resetAt={me.data!.usage.resetAt} />
            <PasswordCard />
            <EmailCard email={me.data!.user.email} />
            <DangerZone />
          </>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: typeof UserRound; children: React.ReactNode }) {
  return (
    <CardTitle className="flex items-center gap-2">
      <Icon className="size-4 text-muted-foreground" />
      {children}
    </CardTitle>
  );
}

function Profile({ user }: { user: User }) {
  const update = useUpdateProfile();
  const [name, setName] = useState(user.name);
  const [language, setLanguage] = useState(user.language);
  const dirty = name.trim() !== user.name || language !== user.language;
  return (
    <Card>
      <CardHeader>
        <SectionTitle icon={UserRound}>Profile</SectionTitle>
        <CardDescription>Your name and the default language for new documents.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="language">Writing language</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger id="language" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter className="justify-end border-t">
        <Button disabled={!dirty || !name.trim() || update.isPending} onClick={() => update.mutate({ name: name.trim(), language: language as Language })}>
          {update.isPending && <Spinner />} Save profile
        </Button>
      </CardFooter>
    </Card>
  );
}

function UsageCard({ used, limit, resetAt }: { used: number; limit: number; resetAt: string }) {
  return (
    <Card>
      <CardHeader>
        <SectionTitle icon={Sparkles}>Usage</SectionTitle>
        <CardDescription>AI checks, rewrites and tone readings count toward a monthly allowance. Instant checks in your browser are always free.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium tabular-nums">
            {used.toLocaleString()} of {limit.toLocaleString()} used
          </span>
          <span className="text-muted-foreground">Resets {new Date(resetAt).toLocaleDateString(undefined, { month: "long", day: "numeric" })}</span>
        </div>
        <Progress value={(used / limit) * 100} className="mt-3 h-2" aria-label="AI usage this month" />
      </CardContent>
    </Card>
  );
}

function PasswordCard() {
  const form = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: "", newPassword: "" } });
  async function onSubmit(values: ChangePasswordInput) {
    try {
      await api("/api/me/password", { method: "POST", body: values });
      form.reset();
      toast.success("Password changed. Other devices have been signed out.");
    } catch (err) {
      if (err instanceof ApiError && err.code === "INVALID_CREDENTIALS") form.setError("currentPassword", { message: err.message });
      else toast.error(errorMessage(err));
    }
  }
  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <CardHeader>
            <SectionTitle icon={KeyRound}>Password</SectionTitle>
            <CardDescription>Changing it signs you out everywhere else.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 py-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="justify-end border-t">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Spinner />} Change password
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

function EmailCard({ email }: { email: string }) {
  const qc = useQueryClient();
  const form = useForm<ChangeEmailInput>({ resolver: zodResolver(changeEmailSchema), defaultValues: { email, currentPassword: "" } });
  async function onSubmit(values: ChangeEmailInput) {
    try {
      await api("/api/me/email", { method: "POST", body: values });
      form.reset({ email: values.email, currentPassword: "" });
      await qc.invalidateQueries({ queryKey: keys.me });
      toast.success("Email updated");
    } catch (err) {
      if (err instanceof ApiError && err.code === "INVALID_CREDENTIALS") form.setError("currentPassword", { message: err.message });
      else if (err instanceof ApiError && err.code === "EMAIL_TAKEN") form.setError("email", { message: err.message });
      else toast.error(errorMessage(err));
    }
  }
  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <CardHeader>
            <SectionTitle icon={Mail}>Email</SectionTitle>
            <CardDescription>The address you sign in with.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 py-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="justify-end border-t">
            <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
              {form.formState.isSubmitting && <Spinner />} Update email
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

function DangerZone() {
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/me", { method: "DELETE", body: { currentPassword: password } });
      qc.clear();
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <SectionTitle icon={ShieldAlert}>Delete account</SectionTitle>
        <CardDescription>Permanently deletes your account, documents, style guide and usage history.</CardDescription>
      </CardHeader>
      <CardFooter className="justify-end border-t">
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Delete account
        </Button>
      </CardFooter>
      <AlertDialog open={open} onOpenChange={(o) => { setOpen(o); setPassword(""); setError(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>This removes everything and cannot be undone. Enter your password to confirm.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="delete-password">Password</Label>
            <Input id="delete-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={!password || busy} onClick={remove}>
              {busy && <Spinner />} Delete everything
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
