import { Select as AntSelect, type SelectProps as AntSelectProps } from "antd";
import clsx from "clsx";

export type SelectProps<T = unknown> = AntSelectProps<T>;

function InternalSelect<T = unknown>({ className, ...props }: SelectProps<T>) {
  return <AntSelect<T> className={clsx(className)} {...props} />;
}

export const Select = Object.assign(InternalSelect, {
  Option: AntSelect.Option,
  OptGroup: AntSelect.OptGroup,
});
