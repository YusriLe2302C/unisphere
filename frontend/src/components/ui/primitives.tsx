import {
  forwardRef,
  cloneElement,
  isValidElement,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  type ReactElement,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { CircleAlert, Search, X } from 'lucide-react';

type ControlSize = 'sm' | 'md' | 'lg';
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ControlSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export function Spinner({
  size = 'md',
  label = 'Loading',
}: {
  size?: ControlSize;
  label?: string;
}) {
  return <span className={`us-spinner us-spinner-${size}`} role="status" aria-label={label} />;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    leadingIcon,
    trailingIcon,
    children,
    className = '',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={props.type ?? 'button'}
      className={`us-button us-button-${variant} us-control-${size}${className ? ` ${className}` : ''}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner size={size} /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: ButtonVariant;
  size?: ControlSize;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = 'ghost', size = 'md', className = '', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={props.type ?? 'button'}
      className={`us-icon-button us-button-${variant} us-control-${size}${className ? ` ${className}` : ''}`}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
});

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  function Label({ className = '', children, ...props }, ref) {
    return (
      <label ref={ref} className={`us-label${className ? ` ${className}` : ''}`} {...props}>
        {children}
      </label>
    );
  },
);

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  size?: ControlSize;
  invalid?: boolean;
  leadingIcon?: ReactNode;
  trailing?: ReactNode;
};
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', invalid, size = 'md', leadingIcon, trailing, ...props },
  ref,
) {
  return (
    <span
      className={['us-input-wrap', leadingIcon && 'has-leading', trailing && 'has-trailing']
        .filter(Boolean)
        .join(' ')}
    >
      {leadingIcon && (
        <span className="us-input-icon" aria-hidden="true">
          {leadingIcon}
        </span>
      )}
      <input
        ref={ref}
        className={['us-input', `us-input-${size}`, invalid && 'is-invalid', className]
          .filter(Boolean)
          .join(' ')}
        aria-invalid={invalid || undefined}
        {...props}
      />
      {trailing && <span className="us-input-trailing">{trailing}</span>}
    </span>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean; size?: ControlSize }
>(function Textarea({ className = '', invalid, size = 'md', ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={['us-textarea', `us-input-${size}`, invalid && 'is-invalid', className]
        .filter(Boolean)
        .join(' ')}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & { invalid?: boolean; size?: ControlSize }
>(function Select({ className = '', invalid, size = 'md', children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={['us-select', `us-input-${size}`, invalid && 'is-invalid', className]
        .filter(Boolean)
        .join(' ')}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  );
});

export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = 'Search',
  ...props
}: Omit<InputProps, 'type' | 'leadingIcon' | 'trailing'> & { onClear?: () => void }) {
  const hasValue = typeof value === 'string' && value.length > 0;
  return (
    <div className="us-search-input">
      <Input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        leadingIcon={<Search size={17} />}
        {...props}
      />
      {hasValue && onClear && (
        <IconButton label="Clear search" size="sm" onClick={onClear}>
          <X size={15} />
        </IconButton>
      )}
    </div>
  );
}

type CheckProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: ReactNode;
  description?: ReactNode;
};
export const Checkbox = forwardRef<HTMLInputElement, CheckProps>(function Checkbox(
  { label, description, className = '', ...props },
  ref,
) {
  return (
    <label className={`us-choice${className ? ` ${className}` : ''}`}>
      <input ref={ref} className="us-check" type="checkbox" {...props} />
      {(label || description) && (
        <span className="us-choice-copy">
          {label && <span className="us-choice-label">{label}</span>}
          {description && <span className="us-choice-description">{description}</span>}
        </span>
      )}
    </label>
  );
});

export const Radio = forwardRef<HTMLInputElement, CheckProps>(function Radio(
  { label, description, className = '', ...props },
  ref,
) {
  return (
    <label className={`us-choice${className ? ` ${className}` : ''}`}>
      <input ref={ref} className="us-radio" type="radio" {...props} />
      {(label || description) && (
        <span className="us-choice-copy">
          {label && <span className="us-choice-label">{label}</span>}
          {description && <span className="us-choice-description">{description}</span>}
        </span>
      )}
    </label>
  );
});

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  id,
  name,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
  id?: string;
  name?: string;
}) {
  const generatedId = useId();
  return (
    <span className="us-switch-row">
      {name && (
        <input type="hidden" name={name} value={checked ? 'true' : 'false'} disabled={disabled} />
      )}
      {label && <Label htmlFor={id ?? generatedId}>{label}</Label>}
      <button
        id={id ?? generatedId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={typeof label === 'string' ? label : undefined}
        disabled={disabled}
        className={['us-switch', checked && 'is-on'].filter(Boolean).join(' ')}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </span>
  );
}

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className = '',
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactElement<{
    id?: string;
    required?: boolean;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
  }>;
  className?: string;
}) {
  const generatedId = useId();
  const id = htmlFor ?? generatedId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const descriptionId = error ? errorId : hint ? hintId : undefined;
  const control = cloneElement(children, {
    id,
    required,
    'aria-describedby': descriptionId,
    'aria-invalid': Boolean(error) || undefined,
  });
  return (
    <div className={`us-form-field${className ? ` ${className}` : ''}`}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="us-required" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </Label>
      {control}
      {error ? (
        <span className="us-field-error" id={errorId} role="alert">
          {error}
        </span>
      ) : (
        hint && (
          <span className="us-field-hint" id={hintId}>
            {hint}
          </span>
        )
      )}
    </div>
  );
}

export interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}
export function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <section className={`us-card us-card-${padding}${className ? ` ${className}` : ''}`}>
      {children}
    </section>
  );
}

export function Tooltip({
  content,
  children,
  placement = 'top',
}: {
  content: ReactNode;
  children: ReactNode;
  placement?: 'top' | 'bottom';
}) {
  const id = useId();
  const target = isValidElement(children)
    ? cloneElement(children as ReactElement<{ 'aria-describedby'?: string }>, {
        'aria-describedby': id,
      })
    : children;
  return (
    <span className={`us-tooltip us-tooltip-${placement}`}>
      {target}
      <span role="tooltip" id={id} className="us-tooltip-content">
        {content}
      </span>
    </span>
  );
}

export function Dropdown({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <details className="us-dropdown">
      <summary>{label}</summary>
      <div className="us-dropdown-menu">{children}</div>
    </details>
  );
}

export function DropdownItem({
  children,
  onSelect,
  disabled = false,
  destructive = false,
}: {
  children: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      className={['us-dropdown-item', destructive && 'is-danger'].filter(Boolean).join(' ')}
      disabled={disabled}
      onClick={(event) => {
        onSelect?.();
        event.currentTarget.closest('details')?.removeAttribute('open');
      }}
    >
      {children}
    </button>
  );
}

export interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}
export function Tabs({
  tabs,
  defaultTab,
  label = 'Sections',
}: {
  tabs: TabItem[];
  defaultTab?: string;
  label?: string;
}) {
  const [active, setActive] = useState(defaultTab ?? tabs.find((tab) => !tab.disabled)?.id ?? '');
  const prefix = useId();
  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const enabled = tabs.filter((tab) => !tab.disabled);
    const current = enabled.findIndex((tab) => tab.id === active);
    const index =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? enabled.length - 1
          : (current + (event.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length;
    const next = enabled[index];
    if (next) {
      setActive(next.id);
      document.getElementById(`${prefix}-tab-${next.id}`)?.focus();
    }
  }
  const selected = tabs.find((tab) => tab.id === active) ?? tabs[0];
  if (!selected) return null;
  return (
    <div className="us-tabs">
      <div className="us-tab-list" role="tablist" aria-label={label}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`${prefix}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`${prefix}-panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => setActive(tab.id)}
            onKeyDown={handleKeyDown}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        className="us-tab-panel"
        role="tabpanel"
        id={`${prefix}-panel-${selected.id}`}
        aria-labelledby={`${prefix}-tab-${selected.id}`}
        tabIndex={0}
      >
        {selected.content}
      </div>
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  siblingCount = 1,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
}) {
  const lastPage = Number.isFinite(totalPages) ? Math.max(0, Math.floor(totalPages)) : 0;
  const currentPage = Math.min(lastPage, Math.max(1, Math.floor(page)));
  const spread = Math.max(0, Math.floor(siblingCount));
  const pages = [
    ...new Set([
      1,
      lastPage,
      ...Array.from(
        { length: Math.min(lastPage, spread * 2 + 1) },
        (_, index) => currentPage - spread + index,
      ),
    ]),
  ]
    .filter((value) => value >= 1 && value <= lastPage)
    .sort((a, b) => a - b);
  return (
    <nav className="us-pagination" aria-label="Pagination">
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Previous
      </Button>
      <div className="us-page-numbers">
        {pages.map((value, index) => (
          <span key={value}>
            {index > 0 && value - pages[index - 1]! > 1 && (
              <span className="us-page-ellipsis" aria-hidden="true">
                …
              </span>
            )}
            <button
              type="button"
              aria-current={value === currentPage ? 'page' : undefined}
              aria-label={`Page ${value}`}
              className={value === currentPage ? 'is-current' : ''}
              onClick={() => onPageChange(value)}
            >
              {value}
            </button>
          </span>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= lastPage}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </Button>
    </nav>
  );
}

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}
export function Table<T extends { id: string | number }>({
  columns,
  rows,
  caption,
  emptyMessage = 'No records to display',
}: {
  columns: TableColumn<T>[];
  rows: T[];
  caption: string;
  emptyMessage?: string;
}) {
  return (
    <div className="us-table-scroll">
      <table className="us-table">
        <caption className="us-sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={column.align ? `align-${column.align}` : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`${column.align ? `align-${column.align} ` : ''}${column.className ?? ''}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="us-table-empty" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Skeleton({
  width,
  height = 16,
  circle = false,
  className = '',
}: {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  className?: string;
}) {
  return (
    <span
      className={['us-skeleton', circle && 'is-circle', className].filter(Boolean).join(' ')}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="us-state">
      <span className="us-state-icon">{icon}</span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="us-state us-state-error" role="alert">
      <span className="us-state-icon">
        <CircleAlert size={20} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: Array<{ label: ReactNode; href?: string }> }) {
  return (
    <nav className="us-breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => (
          <li key={index}>
            {item.href && index < items.length - 1 ? (
              <a href={item.href}>{item.label}</a>
            ) : (
              <span aria-current={index === items.length - 1 ? 'page' : undefined}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  tone = 'brand',
}: {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  tone?: 'brand' | 'success' | 'warning' | 'critical';
}) {
  const percent =
    Number.isFinite(value) && Number.isFinite(max) && max > 0
      ? Math.min(100, Math.max(0, (value / max) * 100))
      : 0;
  return (
    <div className="us-progress">
      <div className="us-progress-heading">
        {label && <span>{label}</span>}
        {showValue && <span>{Math.round(percent)}%</span>}
      </div>
      <div
        className="us-progress-track"
        role="progressbar"
        aria-label={label ?? 'Progress'}
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span className={`us-progress-fill tone-${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
