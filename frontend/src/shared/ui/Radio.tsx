import {
  Radio as AntRadio,
  type RadioChangeEvent,
  type RadioGroupProps as AntRadioGroupProps,
  type RadioProps as AntRadioProps,
} from "antd";
import clsx from "clsx";
import type { FC, ReactNode } from "react";

export type { RadioChangeEvent };

export interface RadioProps extends Pick<
  AntRadioProps,
  "checked" | "defaultChecked" | "disabled" | "onChange" | "name" | "value" | "id" | "autoFocus"
> {
  children?: ReactNode;
  className?: string;
}

export interface RadioGroupProps extends Pick<
  AntRadioGroupProps,
  | "value"
  | "defaultValue"
  | "disabled"
  | "onChange"
  | "name"
  | "options"
  | "optionType"
  | "buttonStyle"
  | "size"
  | "id"
> {
  children?: ReactNode;
  className?: string;
}

const RadioComponent: FC<RadioProps> = ({ children, className, ...rest }) => (
  <AntRadio className={clsx("text-[13px] text-text-secondary", className)} {...rest}>
    {children}
  </AntRadio>
);

const RadioGroup: FC<RadioGroupProps> = ({ children, className, ...rest }) => (
  <AntRadio.Group className={clsx(className)} {...rest}>
    {children}
  </AntRadio.Group>
);

export type RadioType = typeof RadioComponent & {
  Group: typeof RadioGroup;
  Button: typeof AntRadio.Button;
};

export const Radio = RadioComponent as RadioType;
Radio.Group = RadioGroup;
Radio.Button = AntRadio.Button;
export { RadioGroup };
