import {
  Form as AntForm,
  type FormInstance as AntFormInstance,
  type FormItemProps as AntFormItemProps,
  type FormProps as AntFormProps,
} from 'antd';
import type { Rule as AntRule } from 'antd/es/form';
import clsx from 'clsx';
import type { FC, ReactElement } from 'react';

/**
 * Props của biểu mẫu Form.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormProps<T = any> = AntFormProps<T>;

/**
 * Props của từng trường dữ liệu trong Form (Form.Item).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormItemProps<T = any> = AntFormItemProps<T>;

/**
 * Thể hiện (instance) của Form, cung cấp các phương thức getFieldValue, setFieldsValue, validateFields,...
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormInstance<T = any> = AntFormInstance<T>;

/**
 * Quy tắc xác thực dữ liệu (validation rule) cho Form.Item.
 */
export type Rule = AntRule;

const AntFormComponent = AntForm as unknown as FC<FormProps>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function InternalForm<Values = any>({ className, ...props }: FormProps<Values>): ReactElement {
  return <AntFormComponent className={clsx(className)} {...(props as FormProps)} />;
}

/**
 * Biểu mẫu dữ liệu (Form):
 * Quản lý giá trị nhập liệu, xác thực (validation) và submit dữ liệu.
 * Đính kèm sẵn `Form.Item`, `Form.List`, `Form.useForm`, `Form.useWatch`,...
 */
export const Form = Object.assign(InternalForm, {
  Item: AntForm.Item,
  List: AntForm.List,
  ErrorList: AntForm.ErrorList,
  useForm: AntForm.useForm,
  useWatch: AntForm.useWatch,
  useFormInstance: AntForm.useFormInstance,
  Provider: AntForm.Provider,
});
