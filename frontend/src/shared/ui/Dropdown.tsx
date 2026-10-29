import {
  Dropdown as AntDropdown,
  type DropdownProps as AntDropdownProps,
  type MenuProps as AntMenuProps,
} from "antd";
import type { FC } from "react";

export type DropdownProps = AntDropdownProps;

export type MenuProps = AntMenuProps;

type CompoundedDropdown = FC<DropdownProps> & { Button: typeof AntDropdown.Button };

export const Dropdown: CompoundedDropdown = Object.assign(
  ((props: DropdownProps) => <AntDropdown {...props} />) as FC<DropdownProps>,
  { Button: AntDropdown.Button },
);
