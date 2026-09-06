"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, Button, Card, CardBody, Field, Input } from "@/components/ui";
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
      <div className="mb-6 text-center">
        <h1 className="text-lg font-semibold text-primary">Weekly Reports</h1>
        <p className="mt-1 text-sm text-secondary">Sign in to file or review this week&apos;s report.</p>
      </div>

      <Card>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {message && <Alert>{message}</Alert>}

            <Field label="Email" htmlFor="email" error={errors.email?.message} required>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@sisenco.local"
                invalid={!!errors.email}
                {...register("email")}
              />
            </Field>

            <Field label="Password" htmlFor="password" error={errors.password?.message} required>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                invalid={!!errors.password}
                {...register("password")}
              />
            </Field>

            <Button type="submit" className="w-full" loading={login.isPending}>
              Sign in
            </Button>
          </form>
        </CardBody>
      </Card>

      <p className="mt-4 text-center text-sm text-secondary">
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
