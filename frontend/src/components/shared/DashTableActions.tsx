import { cn } from "@/lib/utils";
import { Children, cloneElement, isValidElement } from "react";
import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from "react";

export type DashTableActionsHeadProps = ComponentPropsWithoutRef<"th"> & {
  /** Visible label; use with `srOnly` for icon-only headers */
  children?: ReactNode;
  /** Visually hide label but keep for screen readers */
  srOnly?: boolean;
};

export function DashTableActionsHead({
  children = "Actions",
  srOnly = false,
  className,
  ...rest
}: DashTableActionsHeadProps) {
  return (
    <th scope="col" className={cn("dash-table-actions-head text-right", className)} {...rest}>
      {srOnly ? <span className="sr-only">{children}</span> : children}
    </th>
  );
}

export type DashTableActionsCellProps = ComponentPropsWithoutRef<"td"> & {
  children: ReactNode;
};

/**
 * Last-column cell for row actions. Wrap controls in `dash-table-actions-inner` or pass as children.
 */
export function DashTableActionsCell({ children, className, ...rest }: DashTableActionsCellProps) {
  return (
    <td className={cn("dash-table-actions-cell text-right", className)} {...rest}>
      {children}
    </td>
  );
}

type DashTableActionsInnerProps = ComponentPropsWithoutRef<"div"> & {
  children: ReactNode;
};

function extractText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (!node) return "";
  if (Array.isArray(node)) return node.map(extractText).join(" ").trim();
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return extractText(props.children);
  }
  return "";
}

function withActionLabels(node: ReactNode): ReactNode {
  if (!isValidElement(node)) return node;

  const el = node as ReactElement<{ className?: string; children?: ReactNode; title?: string; "aria-label"?: string; "data-action-label"?: string }>;
  const className = el.props.className ?? "";
  const isDashBtn = /\bdash-btn-sm\b/.test(className);
  const textLabel = extractText(el.props.children).replace(/\s+/g, " ").trim();

  const nextChildren = el.props.children
    ? Children.map(el.props.children, (child) => withActionLabels(child))
    : el.props.children;

  if (isDashBtn && textLabel) {
    return cloneElement(el, {
      children: nextChildren,
      title: undefined,
      "aria-label": el.props["aria-label"] ?? textLabel,
      "data-action-label": el.props["data-action-label"] ?? textLabel,
    });
  }

  return cloneElement(el, { children: nextChildren });
}

export function DashTableActionsInner({ children, className, ...rest }: DashTableActionsInnerProps) {
  return (
    <div className={cn("dash-table-actions-inner", className)} {...rest}>
      {Children.map(children, (child) => withActionLabels(child))}
    </div>
  );
}
