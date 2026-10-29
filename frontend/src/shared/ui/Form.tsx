import {
  Form as AntForm,
  type FormInstance as AntFormInstance,
  type FormItemProps as AntFormItemProps,
  type FormProps as AntFormProps,
} from "antd";
import type { Rule as AntRule } from "antd/es/form";
import clsx from "clsx";
import type { FC, ReactElement } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormProps<T = any> = AntFormProps<T>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormItemProps<T = any> = AntFormItemProps<T>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormInstance<T = any> = AntFormInstance<T>;

export type Rule = AntRule;

const AntFormComponent = AntForm as unknown as FC<FormProps>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function InternalForm<Values = any>({ className, ...props }: FormProps<Values>): ReactElement {
  return <AntFormComponent className={clsx(className)} {...(props as FormProps)} />;
}

export const Form = Object.assign(InternalForm, {
  Item: AntForm.Item,
  List: AntForm.List,
  ErrorList: AntForm.ErrorList,
  useForm: AntForm.useForm,
  useWatch: AntForm.useWatch,
  useFormInstance: AntForm.useFormInstance,
  Provider: AntForm.Provider,
});
