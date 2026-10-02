import {
  Dropdown as AntDropdown,
  type DropdownProps as AntDropdownProps,
  type MenuProps as AntMenuProps,
} from 'antd';
import type { FC } from 'react';

/**
 * Props của component Dropdown (thừa hưởng từ Ant Design DropdownProps).
 */
export type DropdownProps = AntDropdownProps;

/**
 * Props cấu hình menu bên trong Dropdown (thừa hưởng từ Ant Design MenuProps).
 */
export type MenuProps = AntMenuProps;

type CompoundedDropdown = FC<DropdownProps> & { Button: typeof AntDropdown.Button };

/**
 * Menu thả xuống (Dropdown):
 * Bọc Ant Design Dropdown, hỗ trợ hiển thị danh sách menu ngữ cảnh khi click hoặc hover vào phần tử kích hoạt.
 * Hỗ trợ cả `Dropdown.Button`.
 */
export const Dropdown: CompoundedDropdown = Object.assign(
  ((props: DropdownProps) => <AntDropdown {...props} />) as FC<DropdownProps>,
  { Button: AntDropdown.Button },
);
