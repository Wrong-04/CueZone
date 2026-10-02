import { CloseCircleFilled, InfoCircleOutlined } from '@ant-design/icons';
import {
  DatePicker,
  Input,
  InputNumber,
  Select,
  TimePicker,
  Tooltip,
  TreeSelect,
  type DatePickerProps,
  type InputNumberProps,
  type InputProps,
  type SelectProps,
  type TimePickerProps,
  type TreeSelectProps,
} from 'antd';
import type { RangePickerProps } from 'antd/es/date-picker';
import type { TextAreaProps } from 'antd/es/input';
import clsx from 'clsx';
import dayjs, { type Dayjs } from 'dayjs';
import { useId, useMemo, type CSSProperties, type FC, type ReactNode } from 'react';

const CLEAR_ICON = (
  <CloseCircleFilled
    tabIndex={-1}
    aria-hidden="true"
    onMouseDown={(e) => e.preventDefault()}
    className="text-text-muted hover:text-text-secondary cursor-pointer"
  />
);

// `value`/`defaultValue`/`onChange` stay untyped (`any`) on purpose:
// this component multiplexes several unrelated AntD controls
// (Input/InputNumber/DatePicker/Select/TreeSelect...) behind one `type` prop,
// each with an incompatible value/onChange shape. A shared type across all of
// them would be `any` in disguise while forcing every caller to cast; a
// documented escape hatch here is more honest, per docs/CONVENTIONS.md §3.

function toDayjs(val: unknown): Dayjs | null {
  if (!val) return null;
  if (dayjs.isDayjs(val)) return val.isValid() ? val : null;
  if (typeof val === 'string') {
    let parsed = dayjs(val);
    if (!parsed.isValid() && val.includes('/')) {
      const parts = val.split(/[\s/:]+/);
      if (parts.length >= 3) {
        parsed = dayjs(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }
    return parsed.isValid() ? parsed : null;
  }
  if (val instanceof Date || typeof val === 'number') {
    const parsed = dayjs(val);
    return parsed.isValid() ? parsed : null;
  }
  return null;
}

function toTimeDayjs(val: unknown): Dayjs | null {
  if (!val) return null;
  if (dayjs.isDayjs(val)) return val.isValid() ? val : null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const s = match[3] ? parseInt(match[3], 10) : 0;
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59 && s >= 0 && s <= 59) {
        return dayjs().hour(h).minute(m).second(s).millisecond(0);
      }
    }
    const matchNoColon = trimmed.match(/^(\d{2})(\d{2})$/);
    if (matchNoColon) {
      const h = parseInt(matchNoColon[1], 10);
      const m = parseInt(matchNoColon[2], 10);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return dayjs().hour(h).minute(m).second(0).millisecond(0);
      }
    }
    const match3Digits = trimmed.match(/^(\d{1})(\d{2})$/);
    if (match3Digits) {
      const h = parseInt(match3Digits[1], 10);
      const m = parseInt(match3Digits[2], 10);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return dayjs().hour(h).minute(m).second(0).millisecond(0);
      }
    }
    return toDayjs(trimmed);
  }
  return null;
}

/**
 * Các loại điều khiển nhập liệu hỗ trợ trong FloatingInput:
 * - text, password, number, textarea
 * - date, date-range, time
 * - select, tree-select
 */
export type FloatingInputType =
  | 'text'
  | 'password'
  | 'number'
  | 'currency'
  | 'money'
  | 'textarea'
  | 'date'
  | 'date-range'
  | 'time'
  | 'select'
  | 'tree-select';

/**
 * Kích cỡ ô nhập nhãn nổi (small, middle, large).
 */
export type FloatingInputSize = 'small' | 'middle' | 'large';

const SIZE_CLASSES: Record<FloatingInputSize, string> = {
  small: 'h-[40px] min-h-[40px] max-h-[40px] text-xs px-2.5 py-0.5',
  middle: 'h-[40px] min-h-[40px] max-h-[40px] text-sm px-3 py-0.5',
  large: 'h-[40px] min-h-[40px] max-h-[40px] text-base px-3.5 py-1',
};

const DEFAULT_RANGE_PLACEHOLDER: [string, string] = ['Từ ngày', 'Đến ngày'];
const DEFAULT_LABEL_STYLE: CSSProperties = { top: '-8px', backgroundColor: '#ffffff' };

/**
 * Props của component FloatingInput.
 * Hỗ trợ nhãn nổi (label), tooltip hướng dẫn, helperText, thông báo lỗi (error), trạng thái status, cùng props riêng cho từng loại control.
 */
export interface FloatingInputProps {
  id?: string;
  type?: FloatingInputType;
  label?: ReactNode;
  required?: boolean;
  tooltip?: ReactNode;
  helperText?: ReactNode;
  error?: ReactNode;
  status?: 'error' | 'warning';
  disabled?: boolean;
  size?: FloatingInputSize;
  className?: string;
  containerClassName?: string;
  labelClassName?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultValue?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange?: any;
  onPressEnter?: InputProps['onPressEnter'];
  placeholder?: string;
  allowClear?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  options?: SelectProps['options'];
  treeData?: TreeSelectProps['treeData'];
  showSearch?: boolean;
  mode?: SelectProps['mode'];
  format?: string | string[];
  disabledDate?: DatePickerProps['disabledDate'];
  disabledTime?: TimePickerProps['disabledTime'];
  min?: number;
  max?: number;
  step?: number;
  controls?: boolean;
  formatter?: InputNumberProps['formatter'];
  parser?: InputNumberProps['parser'];
  decimalSeparator?: string;
  precision?: number;
  rows?: number;
  maxLength?: number;
  inputProps?: InputProps;
  numberProps?: InputNumberProps;
  textAreaProps?: TextAreaProps;
  dateProps?: DatePickerProps;
  rangeProps?: RangePickerProps;
  timeProps?: TimePickerProps;
  selectProps?: SelectProps;
  treeSelectProps?: TreeSelectProps;
}

/**
 * Ô nhập liệu đa năng có nhãn nổi (Floating Label Input):
 * Hỗ trợ floating label thu nhỏ lên viền trên khi focus/có giá trị.
 * Tích hợp đa dạng loại control (văn bản, số, ngày tháng, khoảng ngày, giờ, select dropdown, tree select).
 */
export const FloatingInput: FC<FloatingInputProps> = ({
  id,
  type = 'text',
  label,
  required = false,
  tooltip,
  helperText,
  error,
  status,
  disabled = false,
  size = 'middle',
  className,
  containerClassName,
  labelClassName,
  value,
  defaultValue,
  onChange,
  onPressEnter,
  placeholder,
  allowClear = true,
  prefix,
  suffix,
  options,
  treeData,
  showSearch,
  mode,
  format,
  disabledDate,
  disabledTime,
  min,
  max,
  step,
  controls,
  formatter,
  parser,
  decimalSeparator,
  precision,
  rows = 3,
  maxLength,
  inputProps,
  numberProps,
  textAreaProps,
  dateProps,
  rangeProps,
  timeProps,
  selectProps,
  treeSelectProps,
}) => {
  const reactId = useId();
  const inputId = id || reactId;
  const isError = Boolean(error) || status === 'error';
  const isWarning = status === 'warning' && !isError;

  const rangePlaceholder: [string, string] = useMemo(
    () => (placeholder ? [placeholder, placeholder] : DEFAULT_RANGE_PLACEHOLDER),
    [placeholder],
  );

  const clearProp = allowClear ? { clearIcon: CLEAR_ICON } : false;

  const renderControl = (): ReactNode => {
    switch (type) {
      case 'password':
        return (
          <Input.Password
            id={inputId}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            onPressEnter={onPressEnter ?? inputProps?.onPressEnter}
            placeholder={placeholder}
            disabled={disabled}
            allowClear={clearProp}
            prefix={prefix}
            suffix={suffix}
            maxLength={maxLength}
            variant="borderless"
            {...inputProps}
            className={clsx(
              '!bg-transparent !p-0 !border-none !shadow-none w-full',
              inputProps?.className,
            )}
          />
        );

      case 'currency':
      case 'money':
      case 'number': {
        const isMoney = type === 'currency' || type === 'money';
        return (
          <InputNumber
            id={inputId}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            onPressEnter={onPressEnter}
            placeholder={placeholder}
            disabled={disabled}
            min={min ?? numberProps?.min ?? (isMoney ? 0 : undefined)}
            max={max ?? numberProps?.max}
            step={step ?? numberProps?.step}
            prefix={prefix ?? numberProps?.prefix}
            suffix={suffix ?? numberProps?.suffix}
            controls={controls ?? numberProps?.controls ?? false}
            formatter={
              formatter ??
              numberProps?.formatter ??
              (isMoney
                ? (val) =>
                    val === undefined || val === ''
                      ? ''
                      : `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                : undefined)
            }
            parser={
              parser ??
              numberProps?.parser ??
              (isMoney ? (val) => (val ?? '').replace(/[^\d]/g, '') : undefined)
            }
            decimalSeparator={decimalSeparator ?? numberProps?.decimalSeparator}
            precision={precision ?? numberProps?.precision}
            variant="borderless"
            {...numberProps}
            className={clsx(
              '!h-full !bg-transparent !p-0 !border-none !shadow-none w-full [&_.ant-input-number-input]:!h-full [&_.ant-input-number-input]:!p-0 [&_input]:!p-0',
              numberProps?.className,
            )}
          />
        );
      }

      case 'textarea':
        return (
          <Input.TextArea
            id={inputId}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            onPressEnter={
              (onPressEnter as unknown as React.KeyboardEventHandler<HTMLTextAreaElement>) ??
              textAreaProps?.onPressEnter
            }
            placeholder={placeholder}
            disabled={disabled}
            allowClear={clearProp}
            rows={rows}
            maxLength={maxLength}
            variant="borderless"
            {...textAreaProps}
            className={clsx(
              '!bg-transparent !p-0 !border-none !shadow-none w-full resize-y',
              textAreaProps?.className,
            )}
          />
        );

      case 'date': {
        const safeValue = toDayjs(value);
        const safeDefault = toDayjs(defaultValue);
        return (
          <DatePicker
            id={inputId}
            value={safeValue}
            defaultValue={safeDefault ?? undefined}
            onChange={onChange}
            placeholder={placeholder ?? 'DD/MM/YYYY'}
            format={format ?? 'DD/MM/YYYY'}
            disabled={disabled}
            allowClear={clearProp}
            disabledDate={disabledDate}
            variant="borderless"
            {...dateProps}
            className={clsx(
              '!bg-transparent !p-0 !border-none !shadow-none w-full',
              dateProps?.className,
            )}
          />
        );
      }

      case 'date-range':
        return (
          <DatePicker.RangePicker
            id={inputId}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            placeholder={rangePlaceholder}
            format={format ?? 'DD/MM/YYYY'}
            disabled={disabled}
            allowClear={clearProp}
            disabledDate={disabledDate}
            variant="borderless"
            {...rangeProps}
            className={clsx(
              '!bg-transparent !p-0 !border-none !shadow-none w-full',
              rangeProps?.className,
            )}
          />
        );

      case 'time': {
        const safeValue = toTimeDayjs(value);
        const safeDefault = toTimeDayjs(defaultValue);
        const timeFormats = format
          ? Array.isArray(format)
            ? format
            : [format, 'HHmm', 'Hmm', 'H:mm']
          : ['HH:mm', 'HHmm', 'Hmm', 'H:mm'];

        return (
          <TimePicker
            id={inputId}
            value={safeValue}
            defaultValue={safeDefault ?? undefined}
            onChange={onChange}
            placeholder={placeholder ?? 'HH:mm'}
            format={timeFormats}
            disabled={disabled}
            allowClear={clearProp}
            disabledDate={disabledDate ?? timeProps?.disabledDate}
            disabledTime={disabledTime ?? timeProps?.disabledTime}
            variant="borderless"
            needConfirm={false}
            {...timeProps}
            className={clsx(
              '!bg-transparent !p-0 !border-none !shadow-none w-full',
              timeProps?.className,
            )}
          />
        );
      }

      case 'select':
        return (
          <Select
            id={inputId}
            value={value === '' ? undefined : value}
            defaultValue={defaultValue === '' ? undefined : defaultValue}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            allowClear={clearProp}
            options={options}
            showSearch={showSearch}
            optionFilterProp="label"
            filterOption={(input, option) =>
              String(option?.label ?? '')
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            mode={mode}
            suffixIcon={suffix}
            variant="borderless"
            {...selectProps}
            className={clsx(
              '!bg-transparent !p-0 !border-none !shadow-none w-full',
              selectProps?.className,
            )}
          />
        );

      case 'tree-select':
        return (
          <TreeSelect
            id={inputId}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            allowClear={clearProp}
            treeData={treeData}
            showSearch={showSearch}
            variant="borderless"
            {...treeSelectProps}
            className={clsx(
              '!bg-transparent !p-0 !border-none !shadow-none w-full',
              treeSelectProps?.className,
            )}
          />
        );

      case 'text':
      default:
        return (
          <Input
            id={inputId}
            type="text"
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            onPressEnter={onPressEnter ?? inputProps?.onPressEnter}
            placeholder={placeholder}
            disabled={disabled}
            allowClear={clearProp}
            prefix={prefix}
            suffix={suffix}
            maxLength={maxLength}
            variant="borderless"
            {...inputProps}
            className={clsx(
              '!bg-transparent !p-0 !border-none !shadow-none w-full',
              inputProps?.className,
            )}
          />
        );
    }
  };

  return (
    <div className={clsx('flex w-full flex-col', className)}>
      <div
        className={clsx(
          'relative box-border flex w-full items-center rounded-md border transition-all duration-200',
          type === 'textarea'
            ? '!h-auto !max-h-none !min-h-[50px] items-start px-2.5 pt-2'
            : mode === 'multiple' || mode === 'tags'
              ? '!h-auto !max-h-none !min-h-[40px] items-center px-2.5 py-1'
              : SIZE_CLASSES[size],
          disabled
            ? 'cursor-not-allowed border-[#d9d9d9] bg-[#f5f5f5] text-[#00000040]'
            : isError
              ? 'border-status-danger bg-bg-card focus-within:border-status-danger focus-within:shadow-[0_0_0_2px_rgba(207,19,34,0.1)]'
              : isWarning
                ? 'border-status-warning bg-bg-card focus-within:border-status-warning focus-within:shadow-[0_0_0_2px_rgba(212,136,6,0.1)]'
                : 'border-border-standard bg-bg-card hover:!border-brand focus-within:!border-brand focus-within:shadow-[0_0_0_2px_rgba(6,168,151,0.12)]',
          containerClassName,
        )}
      >
        {label ? (
          <label
            htmlFor={inputId}
            style={DEFAULT_LABEL_STYLE}
            className={clsx(
              'pointer-events-none absolute left-2.5 z-10 flex select-none items-center gap-1 px-1 text-[11.5px] font-semibold leading-none transition-colors duration-150',
              disabled
                ? 'text-[#00000040]'
                : isError
                  ? 'text-status-danger'
                  : isWarning
                    ? 'text-status-warning'
                    : 'text-[#5a6472]',
              labelClassName,
            )}
          >
            <span>{label}</span>
            {required ? <span className="font-bold text-status-danger">*</span> : null}
            {tooltip ? (
              <Tooltip title={tooltip}>
                <InfoCircleOutlined className="cursor-help text-[10px] text-text-muted" />
              </Tooltip>
            ) : null}
          </label>
        ) : null}

        <div className="floating-input-control flex w-full min-w-0 flex-1 items-center">
          {renderControl()}
        </div>
      </div>

      {isError && typeof error === 'string' ? (
        <span className="mt-1 pl-1 text-[11.5px] font-normal leading-tight text-status-danger">
          {error}
        </span>
      ) : null}
      {!isError && helperText ? (
        <span className="mt-1 pl-1 text-[11.5px] font-normal leading-tight text-text-muted">
          {helperText}
        </span>
      ) : null}
    </div>
  );
};
