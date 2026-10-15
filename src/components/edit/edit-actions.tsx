"use client";

import { Check, Loader2, Pencil, Plus, Save } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EditToggle({
  editing,
  disabled,
  onClick,
  size = "default",
}: {
  editing: boolean;
  disabled?: boolean;
  onClick: () => void;
  size?: "default" | "sm";
}) {
  const Icon = editing ? Check : Pencil;
  return (
    <Button type="button" variant="outline" size={size} disabled={disabled} onClick={onClick}>
      <Icon />
      {editing ? "Finish Edit" : "Edit"}
    </Button>
  );
}

export function SaveButton({
  pending,
  disabled,
  onClick,
  type = "button",
  size = "default",
}: {
  pending: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  size?: "default" | "sm";
}) {
  return (
    <Button type={type} size={size} disabled={pending || disabled} onClick={onClick}>
      {pending ? <Loader2 className="animate-spin" /> : <Save />}
      {pending ? "Saving..." : "Save"}
    </Button>
  );
}

export function CreateButton({
  pending,
  label = "Create",
}: {
  pending: boolean;
  label?: string;
}) {
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Plus />}
      {pending ? "Saving..." : label}
    </Button>
  );
}
