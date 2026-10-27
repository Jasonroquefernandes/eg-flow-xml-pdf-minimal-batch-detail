"use client";

import type { ReactNode } from "react";
import { WarningCircle } from "@phosphor-icons/react";

import { Switch } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/input";

type ControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
};

export function FormField({
  id,
  label,
  required,
  helper,
  error,
  stacked,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  /** Label above the control instead of beside it (for narrow columns). */
  stacked?: boolean;
  children: (props: ControlProps) => ReactNode;
}) {
  const describedBy = [helper && `${id}-help`, error && `${id}-error`]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={stacked ? "bs-field" : "bs-field bs-field--inline"}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <>
            <span aria-hidden="true" className="text-[var(--bs-text-error)]">
              {" "}
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        )}
      </Label>
      {children({
        id,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": error ? true : undefined,
        "aria-required": required ? true : undefined,
      })}
      {helper && (
        <span id={`${id}-help`} className="bs-helper">
          {helper}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="bs-error-msg">
          <WarningCircle size={14} weight="fill" aria-hidden="true" />
          {error}
        </span>
      )}
    </div>
  );
}

export function SelectRow({
  id,
  label,
  description,
  children,
}: {
  id: string;
  label: string;
  description?: string;
  children: (props: Pick<ControlProps, "id" | "aria-describedby">) => ReactNode;
}) {
  return (
    <div
      className={`flex justify-between gap-4 py-3 ${description ? "items-start" : "items-center"}`}
    >
      <div className="min-w-0">
        <label htmlFor={id} className="bs-h4">
          {label}
        </label>
        {description && (
          <p id={`${id}-help`} className="bs-body-sm bs-text-secondary">
            {description}
          </p>
        )}
      </div>
      <div className="w-48 shrink-0 [&_.bs-select-wrapper]:w-full">
        {children({ id, "aria-describedby": description ? `${id}-help` : undefined })}
      </div>
    </div>
  );
}

export function SwitchRow({
  id,
  label,
  description,
  checked,
  onChange,
  onText = "On",
  offText = "Off",
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  onText?: string;
  offText?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p id={`${id}-label`} className="bs-h4">
          {label}
        </p>
        {description && (
          <p id={`${id}-desc`} className="bs-body-sm bs-text-secondary">
            {description}
          </p>
        )}
      </div>
      <Switch
        id={id}
        className="min-h-8 shrink-0"
        checked={checked}
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        onChange={(event) => onChange(event.target.checked)}
      >
        <span className="bs-body-sm w-9">{checked ? onText : offText}</span>
      </Switch>
    </div>
  );
}

export function RadioGroup<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  description,
}: {
  name: string;
  legend: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  description?: string;
}) {
  return (
    <fieldset
      className="flex flex-col gap-1"
      aria-describedby={description ? `${name}-desc` : undefined}
    >
      <legend className="bs-label">{legend}</legend>
      {description && (
        <p id={`${name}-desc`} className="bs-helper">
          {description}
        </p>
      )}
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {options.map((option) => (
          <label
            key={option.value}
            className="inline-flex min-h-8 cursor-pointer items-center gap-2 text-sm"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              className="size-4 accent-[var(--bs-color-primary-default)]"
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
