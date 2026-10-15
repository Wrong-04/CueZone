import { Modal as AntModal, type ModalProps as AntModalProps } from 'antd';
import clsx from 'clsx';
import type { FC } from 'react';

/**
 * Props của component Modal (thừa hưởng từ Ant Design ModalProps).
 */
export type ModalProps = AntModalProps;

type CompoundedModal = FC<ModalProps> & {
  useModal: typeof AntModal.useModal;
  info: typeof AntModal.info;
  success: typeof AntModal.success;
  error: typeof AntModal.error;
  warning: typeof AntModal.warning;
  confirm: typeof AntModal.confirm;
  destroyAll: typeof AntModal.destroyAll;
};

/**
 * Hộp thoại nổi (Modal):
 * Dùng cho các popup xác nhận, form thêm mới/sửa dữ liệu dạng modal.
 * Tích hợp sẵn các phương thức tĩnh: Modal.confirm, Modal.info, Modal.error, Modal.useModal,...
 */
export const Modal: CompoundedModal = Object.assign(
  (({ className, ...props }: ModalProps) => (
    <AntModal className={clsx(className)} {...props} />
  )) as FC<ModalProps>,
  {
    useModal: AntModal.useModal,
    info: AntModal.info,
    success: AntModal.success,
    error: AntModal.error,
    warning: AntModal.warning,
    confirm: AntModal.confirm,
    destroyAll: AntModal.destroyAll,
  },
);
