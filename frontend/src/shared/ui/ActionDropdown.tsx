import { CloseOutlined, DownOutlined } from '@ant-design/icons';
import { Dropdown, type DropdownProps, type MenuProps } from 'antd';
import clsx from 'clsx';
import type { FC, ReactNode } from 'react';

/**
 * Cấu hình cho từng mục trong menu hành động (nhãn, icon, sự kiện click,...).
 */
export interface ActionItem {
  key: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

/**
 * Props của component ActionDropdown.
 * - actions: Danh sách các hành động cần hiển thị trong menu.
 * - onClose: Callback tùy chọn (nếu có, tự động thêm mục "Đóng" màu đỏ ở cuối danh sách).
 * - trigger: Kiểu thao tác mở menu ('click', 'hover',...).
 * - placement: Vị trí thả menu so với nút bấm.
 * - disabled: Vô hiệu hóa toàn bộ dropdown.
 */
export interface ActionDropdownProps {
  actions: ActionItem[];
  onClose?: () => void;
  trigger?: DropdownProps['trigger'];
  placement?: DropdownProps['placement'];
  disabled?: boolean;
}

/**
 * Nút bấm dropdown "Hành động":
 * Hiển thị menu danh sách các thao tác có thể thực hiện trên dòng dữ liệu hoặc trang chi tiết.
 * Tự động gắn thêm nút "Đóng" nếu được truyền prop `onClose`.
 */
export const ActionDropdown: FC<ActionDropdownProps> = ({
  actions,
  onClose,
  trigger = ['click'],
  placement = 'bottomLeft',
  disabled = false,
}) => {
  const allActions: ActionItem[] = onClose
    ? [
        ...actions,
        {
          key: 'close',
          label: 'Đóng',
          icon: <CloseOutlined />,
          danger: true,
          onClick: onClose,
        },
      ]
    : actions;

  const items: MenuProps['items'] = allActions.map((action) => ({
    key: action.key,
    label: action.label,
    icon: action.icon,
    danger: action.danger,
    disabled: action.disabled,
  }));

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    allActions.find((action) => action.key === key)?.onClick?.();
  };

  return (
    <Dropdown
      menu={{ items, onClick: handleClick }}
      trigger={trigger}
      placement={placement}
      disabled={disabled}
    >
      <button
        type="button"
        disabled={disabled}
        className={clsx(
          'inline-flex h-[40px] items-center gap-2 rounded-md border border-border-divider bg-white px-4 text-[13.5px] font-medium text-text-main transition-colors',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-bg-app',
        )}
      >
        Hành động
        <DownOutlined className="text-[11px] text-text-muted" />
      </button>
    </Dropdown>
  );
};
