"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { BrandMark } from "@/components/brand/BrandMark";
import { Alert, Button, Field, Input, PasswordInput } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { useLogin } from "@/lib/queries";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: (user) => {
        const next = searchParams.get("next");
        // Only follow an in-app path, so ?next= cannot be used to bounce
        // someone to another site after they authenticate.
        const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : null;
        router.replace(safeNext ?? (user.role === "MANAGER" ? "/dashboard" : "/reports"));
      },
    });
  });

  const message =
    login.error instanceof ApiError ? login.error.message : login.error ? "Could not sign in." : null;

  return (
    <>
      {/*
        The auth panel already carries the brand at lg and up, so repeating
        it here would just be noise next to it. Below lg that panel is
        hidden entirely, and this becomes the only place brand identity
        appears — which is what lg:hidden is doing, not decoration.
      */}
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 lg:hidden"
        aria-label="Weekly Reports"
      >
        <BrandMark className="size-7 shrink-0" />
        <span className="text-base font-bold text-brand">Weekly Reports</span>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Welcome back.</h1>
        <p className="mt-2 text-sm text-secondary">Sign in to file or review this week&apos;s report.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {message && <Alert>{message}</Alert>}

        <Field label="Email" htmlFor="email" error={errors.email?.message} required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="you@sisenco.local"
            invalid={!!errors.email}
            className="rounded-xl px-4 py-3 text-[15px]"
            {...register("email")}
          />
        </Field>

        <Field label="Password" htmlFor="password" error={errors.password?.message} required>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="••••••••"
            invalid={!!errors.password}
            // pl-4 only, not px-4: the component reserves pr-10 of its own
            // for the show/hide toggle, and px-4 here would override that
            // reservation and run the text under the icon.
            className="rounded-xl py-3 pl-4 text-[15px]"
            {...register("password")}
          />
        </Field>

        <Button
          type="submit"
          className="h-12 w-full rounded-full text-base font-semibold"
          loading={login.isPending}
        >
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-secondary">
        No account?{" "}
        <Link href="/register" className="font-medium text-brand hover:underline">
          Register
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary during prerendering.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
