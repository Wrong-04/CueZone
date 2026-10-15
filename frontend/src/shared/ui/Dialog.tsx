import clsx from 'clsx';
import type { FC, ReactNode } from 'react';

import { Modal } from './Modal';

/**
 * Props của component Dialog.
 */
export interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Tiêu đề hộp thoại (chuỗi hoặc ReactNode). */
  title?: ReactNode;
  /** Icon nằm phía trước tiêu đề, hiển thị màu thương hiệu (brand). */
  icon?: ReactNode;
  /** Độ rộng hộp thoại, mặc định 480px. */
  width?: number;
  /** `null` để ẩn footer; hoặc ReactNode tùy chỉnh các nút bấm. */
  footer?: ReactNode;
  destroyOnHidden?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Hộp thoại tùy biến chuẩn (Dialog):
 * Bọc quanh Modal với tiêu đề chuẩn có icon thương hiệu, đường kẻ ngăn cách header và kích thước mặc định 480px.
 */
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
