import { useCallback, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type Deferred = {
  resolve: (value: boolean) => void;
  options: ConfirmOptions;
};

// Hook que retorna uma função `confirm(options)` imperativa, para substituir window.confirm().
export function useConfirm() {
  const [state, setState] = useState<Deferred | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> =>
      new Promise((resolve) => setState({ resolve, options })),
    [],
  );

  const handleClose = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };

  const dialog = state ? (
    <AlertDialog.Root open onOpenChange={(open) => !open && handleClose(false)}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-bg-elevated p-6 shadow-[var(--shadow-elevation-3)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <AlertDialog.Title className="text-lg font-semibold text-text-primary">
            {state.options.title}
          </AlertDialog.Title>
          {state.options.description && (
            <AlertDialog.Description className="mt-2 text-sm text-text-secondary">
              {state.options.description}
            </AlertDialog.Description>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-surface-2">
              {state.options.cancelLabel ?? "Cancelar"}
            </AlertDialog.Cancel>
            <AlertDialog.Action
              onClick={() => handleClose(true)}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
                state.options.destructive
                  ? "bg-destructive hover:bg-destructive/90"
                  : "bg-accent hover:bg-accent-hover"
              }`}
            >
              {state.options.confirmLabel ?? "Confirmar"}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  ) : null;

  return { confirm, dialog };
}
