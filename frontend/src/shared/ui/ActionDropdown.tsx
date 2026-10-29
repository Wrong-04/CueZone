import { CloseOutlined, DownOutlined } from "@ant-design/icons";
import { Dropdown, type DropdownProps, type MenuProps } from "antd";
import clsx from "clsx";
import type { FC, ReactNode } from "react";

export interface ActionItem {
  key: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export interface ActionDropdownProps {
  actions: ActionItem[];
  onClose?: () => void;
  trigger?: DropdownProps["trigger"];
  placement?: DropdownProps["placement"];
  disabled?: boolean;
}

export const ActionDropdown: FC<ActionDropdownProps> = ({
  actions,
  onClose,
  trigger = ["click"],
  placement = "bottomLeft",
  disabled = false,
}) => {
  const allActions: ActionItem[] = onClose
    ? [
        ...actions,
        {
          key: "close",
          label: "Đóng",
          icon: <CloseOutlined />,
          danger: true,
          onClick: onClose,
        },
      ]
    : actions;

  const items: MenuProps["items"] = allActions.map((action) => ({
    key: action.key,
    label: action.label,
    icon: action.icon,
    danger: action.danger,
    disabled: action.disabled,
  }));

  const handleClick: MenuProps["onClick"] = ({ key }) => {
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
          "inline-flex h-[40px] items-center gap-2 rounded-md border border-border-divider bg-white px-4 text-[13.5px] font-medium text-text-main transition-colors",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-bg-app",
        )}
      >
        Hành động
        <DownOutlined className="text-[11px] text-text-muted" />
      </button>
    </Dropdown>
  );
};
