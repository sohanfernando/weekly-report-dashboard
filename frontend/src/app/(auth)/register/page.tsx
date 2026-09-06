"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, Button, Card, CardBody, Field, Input } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { useLogin, useRegister } from "@/lib/queries";

const schema = z
  .object({
    name: z.string().min(1, "Name is required").max(120),
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    jobTitle: z.string().max(120).optional(),
    password: z.string().min(8, "Use at least 8 characters").max(72),
    confirm: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const registerUser = useRegister();
  const login = useLogin();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", jobTitle: "", password: "", confirm: "" },
  });

  const onSubmit = handleSubmit((values) => {
    registerUser.mutate(
      {
        name: values.name,
        email: values.email,
        password: values.password,
        jobTitle: values.jobTitle || undefined,
      },
      {
        // Sign straight in afterwards: making someone type the same credentials
        // again immediately is pure friction.
        onSuccess: () =>
          login.mutate(
            { email: values.email, password: values.password },
            { onSuccess: () => router.replace("/reports") },
          ),
        onError: (error) => {
          if (error instanceof ApiError) {
            for (const [field, message] of Object.entries(error.fieldErrors)) {
              if (field in values) {
                setError(field as keyof FormValues, { message });
              }
            }
          }
        },
      },
    );
  });

  const message =
    registerUser.error instanceof ApiError && Object.keys(registerUser.error.fieldErrors).length === 0
      ? registerUser.error.message
      : null;

  const busy = registerUser.isPending || login.isPending;

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-lg font-semibold text-foreground">Create your account</h1>
        <p className="mt-1 text-sm text-muted">
          New accounts join as team members. A manager can change that later.
        </p>
      </div>

      <Card>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {message && <Alert>{message}</Alert>}

            <Field label="Full name" htmlFor="name" error={errors.name?.message} required>
              <Input id="name" autoFocus invalid={!!errors.name} {...register("name")} />
            </Field>

            <Field label="Email" htmlFor="email" error={errors.email?.message} required>
              <Input id="email" type="email" autoComplete="email" invalid={!!errors.email} {...register("email")} />
            </Field>

            <Field label="Job title" htmlFor="jobTitle" error={errors.jobTitle?.message} hint="Optional">
              <Input id="jobTitle" placeholder="Backend Developer" {...register("jobTitle")} />
            </Field>

            <Field label="Password" htmlFor="password" error={errors.password?.message} required>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                invalid={!!errors.password}
                {...register("password")}
              />
            </Field>

            <Field label="Confirm password" htmlFor="confirm" error={errors.confirm?.message} required>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                invalid={!!errors.confirm}
                {...register("confirm")}
              />
            </Field>

            <Button type="submit" className="w-full" loading={busy}>
              Create account
            </Button>
          </form>
        </CardBody>
      </Card>

      <p className="mt-4 text-center text-sm text-muted">
        Already have one?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
