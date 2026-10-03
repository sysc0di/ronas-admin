"use client";

import { useEffect, useId, useRef } from "react";

import { cn } from "cn";

/**
 * Building blocks shared by the admin sections. Styling lives in
 * `app/(admin)/admin/admin.css` so the design decisions stay in one place;
 * these components only add structure and behaviour.
 */

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <section className={cn("panel", className)}>{children}</section>;
}

export function PanelHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="panel-header">
      <div>
        <h2 className="panel-title">{title}</h2>

        {description && (
          <p className="panel-description">{description}</p>
        )}
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

type ButtonProps = {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  loading = false,
  children,
  ...props
}: ButtonProps & { loading?: boolean }) {
  return (
    <button
      type={type}
      className={cn(
        "btn",
        variant === "primary" && "btn-primary",
        variant === "secondary" && "btn-secondary",
        variant === "ghost" && "btn-ghost",
        variant === "danger" && "btn-danger",
        size === "sm" && "btn-sm",
        className,
      )}
      aria-busy={loading || undefined}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...props
}: { label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn("icon-button", className)}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({
  label,
  hint,
  error,
  className,
  id,
  ...props
}: { label?: string; hint?: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={inputId}>
          {label}
          {props.required && <span aria-hidden="true"> *</span>}
        </label>
      )}

      <input
        id={inputId}
        className={cn("control", error && "is-invalid", className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(hint && `${inputId}-hint`, error && `${inputId}-error`) || undefined}
        {...props}
      />

      {hint && !error && (
        <span className="field-hint" id={`${inputId}-hint`}>
          {hint}
        </span>
      )}

      {error && (
        <span className="field-error" id={`${inputId}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}

export function Textarea({
  label,
  hint,
  error,
  className,
  id,
  required,
  ...props
}: {
  label?: string;
  hint?: string;
  error?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={textareaId}>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </label>
      )}

      <textarea
        id={textareaId}
        required={required}
        className={cn("control", error && "is-invalid", className)}
        aria-invalid={error ? true : undefined}
        {...props}
      />

      {hint && !error && <span className="field-hint">{hint}</span>}

      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

export function Select({
  label,
  className,
  id,
  children,
  ...props
}: { label?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={selectId}>
          {label}
        </label>
      )}

      <select
        id={selectId}
        className={cn("control", className)}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

export type BadgeTone = "neutral" | "info" | "warn" | "ok" | "danger";

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "badge",
        tone === "info" && "badge-info",
        tone === "warn" && "badge-warn",
        tone === "ok" && "badge-ok",
        tone === "danger" && "badge-danger",
      )}
    >
      {children}
    </span>
  );
}

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("alert", tone === "error" ? "alert-error" : "alert-success")}
    >
      <span aria-hidden="true">{tone === "error" ? "!" : "✓"}</span>
      <span>{children}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <p className="cell-strong">{title}</p>

      {description && (
        <p className="cell-muted max-w-sm">{description}</p>
      )}

      {action}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line-soft">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 px-5 py-3"
        >
          <span className="skeleton size-9 shrink-0 rounded-md" />
          <span className="skeleton h-3 w-40" />
          <span className="skeleton h-3 w-24" />
          <span className="skeleton ml-auto h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      className="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  );
}

/**
 * Dialog with the behaviour the native element would give us: labelled by its
 * title, Escape to dismiss, focus moved inside on open, trapped while open and
 * returned to the trigger on close.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  size?: "md" | "lg";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  /* Held in a ref so an inline onClose does not tear down this effect on every
     parent render — that would restore focus to the trigger mid-typing. */
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const focusable = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]',
        ) ?? [],
      );

    focusable()[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const targets = focusable();

      if (targets.length === 0) return;

      const first = targets[0];
      const last = targets[targets.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        data-size={size}
        className="modal-panel"
      >
        <header className="modal-header">
          <div>
            <h3 className="panel-title" id={titleId}>
              {title}
            </h3>

            {description && (
              <p className="panel-description mono" id={descriptionId}>
                {description}
              </p>
            )}
          </div>

          <IconButton label="Close dialog" onClick={onClose}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="size-4"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </IconButton>
        </header>

        <div className="modal-body">{children}</div>

        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>
  );
}

export function TableShell({
  head,
  children,
}: {
  head: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {head.map((label) => (
              <th key={label} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>{children}</tbody>
      </table>
    </div>
  );
}