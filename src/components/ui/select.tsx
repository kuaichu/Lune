'use client'

import { Select as SelectPrimitive } from '@base-ui/react/select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SelectOption = { value: string; label: string; disabled?: boolean }
export type SelectOptionGroup = { label: string; options: SelectOption[] }

const TONES = {
  admin: {
    trigger:
      'border-admin-line bg-admin-surface text-admin-ink data-[popup-open]:border-admin-line-strong focus-visible:border-admin-accent',
    placeholder: 'text-admin-muted',
    chevron: 'text-admin-violet',
    popup: 'border-admin-line bg-admin-surface text-admin-ink shadow-[0_18px_42px_rgba(30,24,80,0.18)]',
    groupLabel: 'text-admin-muted',
    item: 'data-[highlighted]:bg-admin-tint data-[highlighted]:text-admin-accent data-[selected]:text-admin-accent',
    separator: 'border-admin-line',
  },
  public: {
    trigger:
      'border-line-input bg-surface-input text-ink data-[popup-open]:border-purple-primary focus-visible:border-purple-primary',
    placeholder: 'text-ink-muted',
    chevron: 'text-ink-chevron',
    popup: 'border-line-input bg-surface-input text-ink shadow-[var(--shadow-drawer)]',
    groupLabel: 'text-ink-muted',
    item: 'data-[highlighted]:bg-hover-tint data-[highlighted]:text-purple-primary data-[selected]:text-purple-primary',
    separator: 'border-line-input',
  },
} as const

function isGroup(entry: SelectOption | SelectOptionGroup): entry is SelectOptionGroup {
  return 'options' in entry
}

/**
 * Themed replacement for a native <select>: the OS-drawn popup could not follow the light/dark palette.
 * `value` is a string like a native select's; '' is a normal value (e.g. "全部" or "顶级分类").
 */
export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  icon,
  disabled,
  tone = 'admin',
  className,
  popupClassName,
  'aria-label': ariaLabel,
}: {
  value: string
  onValueChange: (value: string) => void
  options: ReadonlyArray<SelectOption | SelectOptionGroup>
  placeholder?: string
  icon?: React.ReactNode
  disabled?: boolean
  tone?: keyof typeof TONES
  className?: string
  popupClassName?: string
  'aria-label'?: string
}) {
  const styles = TONES[tone]
  const labels = new Map<string, string>()
  for (const entry of options) {
    for (const option of isGroup(entry) ? entry.options : [entry]) labels.set(option.value, option.label)
  }
  const selectedLabel = labels.get(value)

  const renderItem = (option: SelectOption, indent: boolean) => (
    <SelectPrimitive.Item
      key={option.value}
      value={option.value}
      disabled={option.disabled}
      className={cn(
        'relative flex cursor-default items-center gap-2 rounded-[9px] py-1.5 pr-8 text-[13.5px] font-semibold outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[selected]:font-extrabold',
        indent ? 'pl-6' : 'pl-2.5',
        styles.item
      )}
    >
      <SelectPrimitive.ItemText className="truncate">{option.label}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2.5 flex items-center">
        <Check className="h-3.5 w-3.5" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )

  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={(next) => onValueChange(next == null ? '' : String(next))}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={cn(
          'flex h-11 w-full min-w-0 items-center gap-2.5 rounded-[13px] border px-3 text-left text-sm font-bold outline-none transition-colors data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60 motion-reduce:transition-none',
          styles.trigger,
          className
        )}
      >
        {icon && <span className="flex shrink-0 items-center [&_svg]:h-4 [&_svg]:w-4">{icon}</span>}
        <SelectPrimitive.Value className={cn('min-w-0 flex-1 truncate', selectedLabel === undefined && styles.placeholder)}>
          {() => selectedLabel ?? placeholder ?? ''}
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon className={cn('flex shrink-0 items-center', styles.chevron)}>
          <ChevronDown className="h-4 w-4" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner className="isolate z-50 outline-none" sideOffset={6} alignItemWithTrigger={false}>
          <SelectPrimitive.Popup
            className={cn(
              'max-h-[min(var(--available-height),20rem)] min-w-(--anchor-width) overflow-y-auto rounded-[14px] border p-1.5 outline-none origin-(--transform-origin) data-[open]:animate-in data-[open]:fade-in-0 data-[open]:zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95 duration-100',
              styles.popup,
              popupClassName
            )}
          >
            {options.map((entry, index) =>
              isGroup(entry) ? (
                <SelectPrimitive.Group
                  key={`group-${entry.label}-${index}`}
                  className={cn(index > 0 && 'mt-1 border-t pt-1', styles.separator)}
                >
                  <SelectPrimitive.GroupLabel className={cn('px-2.5 pb-1 pt-1.5 text-xs font-extrabold', styles.groupLabel)}>
                    {entry.label}
                  </SelectPrimitive.GroupLabel>
                  {entry.options.map((option) => renderItem(option, true))}
                </SelectPrimitive.Group>
              ) : (
                renderItem(entry, false)
              )
            )}
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
