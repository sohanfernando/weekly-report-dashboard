"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { BrandMark } from "@/components/brand/BrandMark";
import { Alert, Button, Field, Input, PasswordInput, SegmentedRadio } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { useLogin, useRegister } from "@/lib/queries";

const schema = z
  .object({
    name: z.string().min(1, "Name is required").max(120),
    role: z.enum(["MEMBER", "MANAGER"]),
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
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      jobTitle: "",
      password: "",
      confirm: "",
      // MEMBER by default: the narrower of the two, so an inattentive signup
      // does not end up reading the whole team's reports.
      role: "MEMBER",
    },
  });

  const role = useWatch({ control, name: "role" });

  const onSubmit = handleSubmit((values) => {
    registerUser.mutate(
      {
        name: values.name,
        email: values.email,
        password: values.password,
        jobTitle: values.jobTitle || undefined,
        role: values.role,
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
        <span className="text-xl font-bold text-brand">Weekly Reports</span>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Create your account</h1>
        <p className="mt-2 text-sm text-secondary">
          Pick the role you are joining as. A manager can change it later.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {message && <Alert>{message}</Alert>}

        <Field
          label="I am joining as"
          error={errors.role?.message}
          hint={
            role === "MANAGER"
              ? "Managers review the whole team's reports and manage users and projects."
              : "Members file their own weekly report and see only their own."
          }
          required
        >
          <SegmentedRadio
            value={role}
            registration={register("role")}
            options={[
              { value: "MEMBER", label: "Team member" },
              { value: "MANAGER", label: "Manager" },
            ]}
          />
        </Field>

        <Field label="Full name" htmlFor="name" error={errors.name?.message} required>
          <Input
            id="name"
            autoFocus
            invalid={!!errors.name}
            className="rounded-xl px-4 py-3 text-[15px]"
            {...register("name")}
          />
        </Field>

        <Field label="Email" htmlFor="email" error={errors.email?.message} required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            invalid={!!errors.email}
            className="rounded-xl px-4 py-3 text-[15px]"
            {...register("email")}
          />
        </Field>

        <Field label="Job title" htmlFor="jobTitle" error={errors.jobTitle?.message} hint="Optional">
          <Input
            id="jobTitle"
            placeholder="Backend Developer"
            className="rounded-xl px-4 py-3 text-[15px]"
            {...register("jobTitle")}
          />
        </Field>

        <Field label="Password" htmlFor="password" error={errors.password?.message} required>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            invalid={!!errors.password}
            // pl-4 only — see the note on the login page's password field.
            className="rounded-xl py-3 pl-4 text-[15px]"
            {...register("password")}
          />
        </Field>

        <Field label="Confirm password" htmlFor="confirm" error={errors.confirm?.message} required>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            invalid={!!errors.confirm}
            className="rounded-xl py-3 pl-4 text-[15px]"
            {...register("confirm")}
          />
        </Field>

        <Button
          type="submit"
          className="h-12 w-full rounded-full text-base font-semibold"
          loading={busy}
        >
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-secondary">
        Already have one?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
