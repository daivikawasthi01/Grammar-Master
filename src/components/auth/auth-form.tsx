"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { Eye, EyeOff } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError, errorMessage } from "@/lib/api";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "@/shared/schemas";

function safeNext(next: string | null) {
  // Only same-site paths: an open redirect would let a phishing link bounce users anywhere.
  return next && next.startsWith("/app") && !next.startsWith("//") ? next : "/app";
}

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} className="pr-10" {...props} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const [formError, setFormError] = useState<string | null>(params.get("expired") ? "Your session ended. Sign in again to continue." : null);
  const isRegister = mode === "register";

  const form = useForm<RegisterInput>({
    resolver: zodResolver((isRegister ? registerSchema : loginSchema) as typeof registerSchema),
    defaultValues: { name: "", email: "", password: "" },
    mode: "onTouched",
  });

  async function onSubmit(values: RegisterInput | LoginInput) {
    setFormError(null);
    try {
      await api(isRegister ? "/api/auth/register" : "/api/auth/login", { method: "POST", body: values });
      qc.clear();
      router.replace(safeNext(params.get("next")));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_TAKEN") form.setError("email", { message: err.message });
      else if (err instanceof ApiError && err.code === "VALIDATION_FAILED") {
        const issues = (err.details?.issues as { path: string; message: string }[] | undefined) ?? [];
        issues.forEach((i) => form.setError(i.path as keyof RegisterInput, { message: i.message }));
        if (!issues.length) setFormError(err.message);
      } else setFormError(errorMessage(err));
    }
  }

  const submitting = form.formState.isSubmitting;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500">
      <h1 className="text-2xl font-semibold tracking-tight">{isRegister ? "Create your account" : "Welcome back"}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {isRegister ? "Start writing with instant feedback. No card needed." : "Sign in to pick up where you left off."}
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
          {isRegister && (
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" placeholder="Ada Lovelace" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete={isRegister ? "new-password" : "current-password"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {formError && (
            <motion.p role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </motion.p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting && <Spinner />}
            {isRegister ? "Create account" : "Sign in"}
          </Button>
        </form>
      </Form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isRegister ? "Already have an account? " : "New here? "}
        <Link href={isRegister ? "/login" : "/register"} className="font-medium text-foreground underline-offset-4 hover:underline">
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
