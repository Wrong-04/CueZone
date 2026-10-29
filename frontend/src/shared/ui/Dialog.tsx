import clsx from "clsx";
import type { FC, ReactNode } from "react";

import { Modal } from "./Modal";

export interface DialogProps {
  open: boolean;
  onClose: () => void;

  title?: ReactNode;

  icon?: ReactNode;

  width?: number;

  footer?: ReactNode;
  destroyOnHidden?: boolean;
  className?: string;
  children: ReactNode;
}

export const Dialog: FC<DialogProps> = ({
  open,
  onClose,
  title,
  icon,
  width = 480,
  footer,
  destroyOnHidden,
  className,
  children,
}) => {
  const hasTitle = title !== undefined || icon !== undefined;

  const titleRow = hasTitle ? (
    <div
      data-testid="dialog-title-row"
      className="flex items-center gap-2 text-text-main font-bold text-base pb-2 border-b border-border-divider"
    >
      {icon ? <span className="text-brand">{icon}</span> : null}
      {title ? <span>{title}</span> : null}
    </div>
  ) : undefined;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={width}
      footer={footer}
      destroyOnHidden={destroyOnHidden}
      title={titleRow}
      className={clsx(className)}
    >
      {children}
    </Modal>
  );
};
