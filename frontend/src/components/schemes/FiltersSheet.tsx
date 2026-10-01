import { RefObject, useEffect, useState } from "react";
import { Drawer } from "vaul";
import { PayForCategory, SchemeStatusKind } from "@/types/scheme";
import {
  AreaOption,
  applyFilters,
  BrowseFilters,
  getOptionCounts,
  getPayForOptions,
  PAY_FOR_PREVIEW,
  STATUS_FILTER_LABELS,
  STATUS_ORDER,
} from "@/util/schemeBrowse";
import { PAY_FOR_META, SchemeWithStatus } from "@/util/schemeCatalog";
import SchemeIcon, { FOCUS_RING } from "./SchemeIcon";

function FilterOption({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1 text-[15px] text-gray-800 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-interaction-main-default">
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        aria-hidden
        className={`flex size-5 shrink-0 items-center justify-center rounded ${
          checked
            ? "bg-interaction-main-default"
            : "border border-gray-400 bg-white"
        }`}
      >
        {checked && <SchemeIcon name="tick" size={16} />}
      </span>
      <span className="flex-1">{label}</span>
      <span className="text-sm text-gray-600">
        {count}
        <span className="sr-only"> schemes</span>
      </span>
    </label>
  );
}

const toggle = <T,>(values: T[], value: T, on: boolean): T[] =>
  on ? [...values, value] : values.filter((v) => v !== value);

// Bottom sheet with the Status / Helps pay for / Area checkboxes. Changes are
// a draft until "Show {n} schemes" applies them.
export default function FiltersSheet({
  isOpen,
  onClose,
  items,
  filters,
  areaOptions,
  onApply,
  returnFocusRef,
}: {
  isOpen: boolean;
  onClose: () => void;
  items: SchemeWithStatus[];
  filters: BrowseFilters;
  areaOptions: AreaOption[];
  onApply: (filters: BrowseFilters) => void;
  returnFocusRef: RefObject<HTMLElement>;
}) {
  const [draft, setDraft] = useState(filters);
  const [showAllPayFor, setShowAllPayFor] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraft(filters);
      setShowAllPayFor(false);
    }
    // Only reset when the sheet opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const counts = getOptionCounts(items, draft);
  const payForOptions = getPayForOptions(items);
  const visiblePayFor =
    showAllPayFor ||
    draft.payFor.some(
      (c) => !payForOptions.slice(0, PAY_FOR_PREVIEW).includes(c),
    )
      ? payForOptions
      : payForOptions.slice(0, PAY_FOR_PREVIEW);
  const resultCount = applyFilters(items, draft).length;

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[90dvh] flex-col rounded-t-3xl bg-white outline-none"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef.current?.focus();
          }}
        >
          <Drawer.Handle className="my-2" />
          <div className="flex items-center justify-between px-5 pt-2">
            <Drawer.Title className="text-[22px] font-bold leading-7 text-gray-800">
              Filters
            </Drawer.Title>
            <button
              type="button"
              onClick={() =>
                setDraft({ ...draft, status: [], payFor: [], area: [] })
              }
              className={`min-h-11 px-2 text-sm font-semibold text-interaction-links-default ${FOCUS_RING}`}
            >
              Clear all
            </button>
          </div>
          <Drawer.Description className="sr-only">
            Filter the list of caregiving schemes
          </Drawer.Description>

          <div className="flex flex-col gap-4 overflow-y-auto px-5 pb-4">
            <fieldset className="flex flex-col">
              <legend className="pb-1 text-sm font-bold text-gray-800">
                Status
              </legend>
              {STATUS_ORDER.map((kind: SchemeStatusKind) => (
                <FilterOption
                  key={kind}
                  label={STATUS_FILTER_LABELS[kind]}
                  count={counts.status[kind]}
                  checked={draft.status.includes(kind)}
                  onChange={(on) =>
                    setDraft({
                      ...draft,
                      status: toggle(draft.status, kind, on),
                    })
                  }
                />
              ))}
            </fieldset>

            <fieldset className="flex flex-col">
              <legend className="pb-1 text-sm font-bold text-gray-800">
                Helps pay for
              </legend>
              {visiblePayFor.map((category: PayForCategory) => (
                <FilterOption
                  key={category}
                  label={PAY_FOR_META[category].label}
                  count={counts.payFor[category]}
                  checked={draft.payFor.includes(category)}
                  onChange={(on) =>
                    setDraft({
                      ...draft,
                      payFor: toggle(draft.payFor, category, on),
                    })
                  }
                />
              ))}
              {visiblePayFor.length < payForOptions.length && (
                <button
                  type="button"
                  onClick={() => setShowAllPayFor(true)}
                  className={`min-h-11 self-start px-1 text-sm font-semibold text-interaction-links-default ${FOCUS_RING}`}
                >
                  Show all {payForOptions.length}
                </button>
              )}
            </fieldset>

            <fieldset className="flex flex-col">
              <legend className="pb-1 text-sm font-bold text-gray-800">
                Area
              </legend>
              {areaOptions.map((option) => (
                <FilterOption
                  key={option.value}
                  label={option.label}
                  count={counts.area[option.value] ?? 0}
                  checked={draft.area.includes(option.value)}
                  onChange={(on) =>
                    setDraft({
                      ...draft,
                      area: toggle(draft.area, option.value, on),
                    })
                  }
                />
              ))}
            </fieldset>
          </div>

          <div className="border-t border-gray-200 px-5 pb-6 pt-3">
            <button
              type="button"
              onClick={() => {
                onApply(draft);
                onClose();
              }}
              className={`flex min-h-11 w-full items-center justify-center rounded-lg bg-interaction-main-default px-4 text-[15px] font-semibold text-white hover:bg-interaction-main-hover ${FOCUS_RING}`}
            >
              Show {resultCount} {resultCount === 1 ? "scheme" : "schemes"}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
