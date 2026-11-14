import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CircleAlert, CircleCheck, CircleX, Info, X } from 'lucide-react';
import { Button, IconButton, type ButtonVariant } from './primitives';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
};

function DialogFrame({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  closeLabel = 'Close',
  drawer = false,
}: DialogProps & { drawer?: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <dialog
      ref={dialogRef}
      className={['us-dialog', drawer && 'us-drawer'].filter(Boolean).join(' ')}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header className="us-dialog-header">
        <div>
          <h2 id={titleId}>{title}</h2>
          {description && <p id={descriptionId}>{description}</p>}
        </div>
        <IconButton label={closeLabel} onClick={onClose}>
          <X size={18} />
        </IconButton>
      </header>
      <div className="us-dialog-content">{children}</div>
      {footer && <footer className="us-dialog-footer">{footer}</footer>}
    </dialog>,
    document.body,
  );
}

export function Modal(props: DialogProps) {
  return <DialogFrame {...props} />;
}

export function Drawer(props: DialogProps) {
  return <DialogFrame {...props} drawer />;
}

export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ButtonVariant;
  busy?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <span className="us-confirm-icon">
        <CircleAlert size={20} />
      </span>
    </Modal>
  );
}

export type ToastTone = 'success' | 'error' | 'info';
export function Toast({
  message,
  title,
  tone = 'info',
  onDismiss,
  action,
}: {
  message: ReactNode;
  title?: ReactNode;
  tone?: ToastTone;
  onDismiss?: () => void;
  action?: ReactNode;
}) {
  const Icon = tone === 'success' ? CircleCheck : tone === 'error' ? CircleX : Info;
  return (
    <div className={`us-toast tone-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon className="us-toast-icon" size={19} aria-hidden="true" />
      <div className="us-toast-copy">
        {title && <strong>{title}</strong>}
        <span>{message}</span>
        {action}
      </div>
      {onDismiss && (
        <IconButton label="Dismiss notification" size="sm" onClick={onDismiss}>
          <X size={16} />
        </IconButton>
      )}
    </div>
  );
}
