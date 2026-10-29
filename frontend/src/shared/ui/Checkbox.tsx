import {
  Checkbox as AntCheckbox,
  type GetProps,
  type CheckboxProps as AntCheckboxProps,
} from "antd";
import clsx from "clsx";
import type { FC, ReactNode } from "react";

export interface CheckboxProps extends Pick<
  AntCheckboxProps,
  "checked" | "defaultChecked" | "disabled" | "indeterminate" | "onChange" | "name" | "value"
> {
  children?: ReactNode;
  className?: string;

  "aria-label"?: string;
}

export type CheckboxGroupProps = GetProps<typeof AntCheckbox.Group>;

const CheckboxComponent: FC<CheckboxProps> = ({ children, className, ...rest }) => (
  <AntCheckbox className={clsx("text-[13px] text-text-secondary", className)} {...rest}>
    {children}
  </AntCheckbox>
);

export type CompoundedCheckbox = FC<CheckboxProps> & {
  Group: typeof AntCheckbox.Group;
};

export const Checkbox: CompoundedCheckbox = Object.assign(CheckboxComponent as CompoundedCheckbox, {
  Group: AntCheckbox.Group,
});
