"use client";

import {
  appSelectCompact,
  appSelectFilter,
  appSelectMarketing,
  appSelectMenuList,
  appSelectMenuOption,
  appSelectMenuOptionFocused,
  appSelectMenuOptionSelected,
  appSelectMenuPanel,
  appSelectMenuSearch,
  appSelectNative,
} from "@/components/shared/form/formStyles";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";

export type AppSelectOption = {
  value: string;
  label: string;
};

export type AppSelectVariant = "default" | "filter" | "compact" | "marketing";

const VARIANT_TRIGGER: Record<AppSelectVariant, string> = {
  default: appSelectNative,
  filter: appSelectFilter,
  compact: appSelectCompact,
  marketing: appSelectMarketing,
};

const CHEVRON_WRAP: Record<AppSelectVariant, string> = {
  default: "w-10",
  filter: "w-8",
  compact: "w-8",
  marketing: "w-9 sm:w-8",
};

const SEARCH_THRESHOLD = 12;

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  variant?: AppSelectVariant;
  options?: AppSelectOption[];
  placeholder?: string;
  loading?: boolean;
  children?: ReactNode;
  wrapperClassName?: string;
};

export function AppSelect({
  variant = "default",
  options = [],
  placeholder,
  loading,
  className,
  wrapperClassName,
  disabled,
  id,
  value,
  defaultValue,
  onChange,
  onBlur,
  required,
  name,
  "aria-label": ariaLabel,
}: Props) {
  const listId = useId();
  const searchId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focusIndex, setFocusIndex] = useState(-1);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDisabled = Boolean(disabled || loading);
  const selectedValue =
    value !== undefined && value !== null ? String(value) : defaultValue !== undefined ? String(defaultValue) : "";
  const showPlaceholderOption = Boolean(placeholder && !required);
  const minFocusIndex = showPlaceholderOption ? -1 : 0;

  const selectedOption = useMemo(
    () => options.find((o) => o.value === selectedValue),
    [options, selectedValue],
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const searchable = options.length > SEARCH_THRESHOLD;
  const displayLabel = loading ? "Loading…" : (selectedOption?.label ?? placeholder ?? "Select…");
  const isPlaceholder = !selectedOption && !loading;

  const emitChange = useCallback(
    (newValue: string) => {
      onChange?.({
        target: { value: newValue, name: name ?? "" },
        currentTarget: { value: newValue, name: name ?? "" },
      } as ChangeEvent<HTMLSelectElement>);
    },
    [onChange, name],
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setFocusIndex(-1);
  }, []);

  const selectValue = useCallback(
    (newValue: string) => {
      emitChange(newValue);
      close();
      triggerRef.current?.focus();
    },
    [emitChange, close],
  );

  const openMenu = useCallback(() => {
    setOpen(true);
    if (selectedValue === "" && showPlaceholderOption) {
      setFocusIndex(-1);
      return;
    }
    const idx = filteredOptions.findIndex((o) => o.value === selectedValue);
    setFocusIndex(idx >= 0 ? idx : 0);
  }, [filteredOptions, selectedValue, showPlaceholderOption]);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const maxPanel = 288;
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openBelow = spaceBelow >= 140 || spaceBelow >= spaceAbove;

    setPanelStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      zIndex: 950,
      ...(openBelow
        ? { top: rect.bottom + gap, maxHeight: Math.min(maxPanel, Math.max(120, spaceBelow)) }
        : {
            bottom: window.innerHeight - rect.top + gap,
            maxHeight: Math.min(maxPanel, Math.max(120, spaceAbove)),
          }),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updatePosition, filteredOptions.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      close();
      onBlur?.({
        target: { value: selectedValue, name: name ?? "" },
        currentTarget: { value: selectedValue, name: name ?? "" },
      } as FocusEvent<HTMLSelectElement>);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, close, onBlur, selectedValue]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (open && searchable) {
      const t = window.setTimeout(() => searchRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
  }, [open, searchable]);

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (isDisabled) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) openMenu();
    }
  };

  const onListKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIndex((i) => Math.min(filteredOptions.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIndex((i) => Math.max(minFocusIndex, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusIndex === -1 && showPlaceholderOption) selectValue("");
      else if (focusIndex >= 0 && filteredOptions[focusIndex]) selectValue(filteredOptions[focusIndex].value);
    } else if (e.key === "Home") {
      e.preventDefault();
      setFocusIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setFocusIndex(filteredOptions.length - 1);
    }
  };

  const menu =
    open && mounted ? (
      <div ref={panelRef} className={appSelectMenuPanel} style={panelStyle} onKeyDown={onListKeyDown}>
        {searchable ? (
          <input
            ref={searchRef}
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setFocusIndex(0);
            }}
            placeholder="Search…"
            className={appSelectMenuSearch}
            autoComplete="off"
            aria-controls={listId}
          />
        ) : null}
        <ul id={listId} role="listbox" className={appSelectMenuList} aria-label={ariaLabel}>
          {showPlaceholderOption ? (
            <li role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={selectedValue === ""}
                className={cn(
                  appSelectMenuOption,
                  "w-[calc(100%-0.5rem)] text-zinc-500",
                  selectedValue === "" && appSelectMenuOptionSelected,
                  focusIndex === -1 && appSelectMenuOptionFocused,
                )}
                onMouseEnter={() => setFocusIndex(-1)}
                onClick={() => selectValue("")}
              >
                {loading ? "Loading…" : placeholder}
              </button>
            </li>
          ) : null}
          {filteredOptions.length === 0 ? (
            <li className="px-3 py-3 text-center text-sm text-zinc-500" role="presentation">
              No matches
            </li>
          ) : (
            filteredOptions.map((o, index) => {
              const selected = o.value === selectedValue;
              const focused = index === focusIndex;
              return (
                <li key={o.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      appSelectMenuOption,
                      "w-[calc(100%-0.5rem)]",
                      selected && appSelectMenuOptionSelected,
                      focused && appSelectMenuOptionFocused,
                    )}
                    onMouseEnter={() => setFocusIndex(index)}
                    onClick={() => selectValue(o.value)}
                  >
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    {selected ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-clOcean" strokeWidth={2.5} aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    ) : null;

  return (
    <div className={cn("relative", wrapperClassName)}>
      {name ? <input type="hidden" name={name} value={selectedValue} /> : null}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={isDisabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        aria-required={required}
        className={cn(
          VARIANT_TRIGGER[variant],
          "relative flex w-full items-center text-left",
          isPlaceholder && "text-zinc-400",
          loading && "text-zinc-400",
          open && "border-clOcean ring-2 ring-clOcean/20",
          className,
        )}
        onClick={() => {
          if (isDisabled) return;
          if (open) close();
          else openMenu();
        }}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="min-w-0 flex-1 truncate pr-1">{displayLabel}</span>
      </button>
      <span
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 flex items-center justify-center",
          CHEVRON_WRAP[variant],
        )}
        aria-hidden
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-clOcean/70" />
        ) : (
          <ChevronDown
            className={cn("h-4 w-4 text-zinc-400 transition-transform duration-200", open && "rotate-180")}
            strokeWidth={2}
          />
        )}
      </span>
      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
