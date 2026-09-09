"use client";

import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Loading,
  PageHeader,
  PasswordInput,
} from "@/components/ui";
import { ApiError } from "@/lib/api";
import { shortDate } from "@/lib/format";
import { useChangePassword, useMe, useUpdateProfile } from "@/lib/queries";

/** Account settings: the profile fields a user may change about themselves. */
export default function SettingsPage() {
  const { data: user, isPending } = useMe();

  if (isPending) return <Loading />;
  if (!user) return null;

  return (
    <>
      <PageHeader title="Account settings" description="Your profile and sign-in details." />

      <div className="grid gap-5 lg:grid-cols-2">
        <ProfileCard
          key={user.id}
          name={user.name}
          jobTitle={user.jobTitle ?? ""}
          email={user.email}
          role={user.role}
          joined={user.createdAt}
        />
        <PasswordCard />
      </div>
    </>
  );
}

function ProfileCard({
  name: initialName,
  jobTitle: initialJobTitle,
  email,
  role,
  joined,
}: {
  name: string;
  jobTitle: string;
  email: string;
  role: string;
  joined: string | null;
}) {
  const updateProfile = useUpdateProfile();
  const [name, setName] = useState(initialName);
  const [jobTitle, setJobTitle] = useState(initialJobTitle);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameError = !name.trim() ? "Name is required" : undefined;

  return (
    <Card>
      <CardHeader title="Profile" description="How your name appears on reports and the dashboard." />
      <CardBody className="space-y-4">
        {error && <Alert>{error}</Alert>}
        {saved && <Alert tone="success">Profile updated.</Alert>}

        <Field label="Full name" htmlFor="profile-name" error={nameError} required>
          <Input
            id="profile-name"
            value={name}
            invalid={!!nameError}
            onChange={(event) => {
              setName(event.target.value);
              setSaved(false);
            }}
          />
        </Field>

        <Field label="Job title" htmlFor="profile-job">
          <Input
            id="profile-job"
            value={jobTitle}
            onChange={(event) => {
              setJobTitle(event.target.value);
              setSaved(false);
            }}
          />
        </Field>

        {/* Email and role are read-only here: an email change would move the
            login identity, and a role change is a manager's decision. */}
        <Field label="Email" hint="Contact a manager to change your email">
          <Input value={email} disabled readOnly />
        </Field>

        <div className="flex items-center gap-2 text-xs text-secondary">
          <Badge>{role === "MANAGER" ? "Manager" : "Team member"}</Badge>
          {joined && <span>Joined {shortDate(joined)}</span>}
        </div>

        <div className="flex justify-end">
          <Button
            loading={updateProfile.isPending}
            disabled={!!nameError}
            onClick={() => {
              setError(null);
              setSaved(false);
              updateProfile.mutate(
                { name: name.trim(), jobTitle: jobTitle.trim() || null },
                {
                  onSuccess: () => setSaved(true),
                  onError: (err) =>
                    setError(err instanceof ApiError ? err.message : "Could not save."),
                },
              );
            }}
          >
            Save changes
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function PasswordCard() {
  const changePassword = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextError = touched && next.length < 8 ? "Use at least 8 characters" : undefined;
  const confirmError = touched && next !== confirm ? "Passwords do not match" : undefined;

  return (
    <Card>
      <CardHeader
        title="Password"
        description="You need your current password to set a new one."
      />
      <CardBody className="space-y-4">
        {error && <Alert>{error}</Alert>}
        {done && <Alert tone="success">Password changed.</Alert>}

        <Field label="Current password" htmlFor="current-password" required>
          {/*
            "new-password", deliberately, on a field that holds the *current*
            one. The semantically correct value is "current-password", and that
            is what the sign-in page uses — but there it is an invitation the
            browser should accept, and here it is not.

            This field exists so somebody proves they know the password before
            changing it. A manager filling it in defeats that: anyone at an
            unlocked machine could then change the password without knowing it.
            The reveal toggle makes it worse, because ours shows the value with
            no OS check, where Chrome's own reveal asks for one.

            autocomplete="off" is not an option — browsers ignore it on
            password inputs. Marking the field as a new password is the only
            reliable way to tell them not to fill it.
          */}
          <PasswordInput
            id="current-password"
            autoComplete="new-password"
            value={current}
            onChange={(event) => {
              setCurrent(event.target.value);
              setDone(false);
            }}
          />
        </Field>

        <Field label="New password" htmlFor="new-password" error={nextError} required>
          <PasswordInput
            id="new-password"
            autoComplete="new-password"
            value={next}
            invalid={!!nextError}
            onChange={(event) => {
              setNext(event.target.value);
              setDone(false);
            }}
          />
        </Field>

        <Field label="Confirm new password" htmlFor="confirm-password" error={confirmError} required>
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            value={confirm}
            invalid={!!confirmError}
            onChange={(event) => {
              setConfirm(event.target.value);
              setDone(false);
            }}
          />
        </Field>

        <div className="flex justify-end">
          <Button
            loading={changePassword.isPending}
            onClick={() => {
              setTouched(true);
              setError(null);
              setDone(false);
              if (!current || next.length < 8 || next !== confirm) return;

              changePassword.mutate(
                { currentPassword: current, newPassword: next },
                {
                  onSuccess: () => {
                    setDone(true);
                    setCurrent("");
                    setNext("");
                    setConfirm("");
                    setTouched(false);
                  },
                  onError: (err) =>
                    setError(
                      err instanceof ApiError ? err.message : "Could not change the password.",
                    ),
                },
              );
            }}
          >
            Change password
          </Button>
        </div>

        <p className="text-xs text-secondary">
          Your session stays valid after a password change. Sign out on other devices by waiting for
          the token to expire.
        </p>
      </CardBody>
    </Card>
  );
}
