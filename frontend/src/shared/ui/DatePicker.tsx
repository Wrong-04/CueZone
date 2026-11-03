import { DatePicker as AntDatePicker, type DatePickerProps as AntDatePickerProps } from "antd";
import clsx from "clsx";

export type DatePickerProps = AntDatePickerProps;

function InternalDatePicker({ className, ...props }: DatePickerProps) {
  return <AntDatePicker className={clsx(className)} {...props} />;
}

export const DatePicker = Object.assign(InternalDatePicker, {
  RangePicker: AntDatePicker.RangePicker,
  TimePicker: AntDatePicker.TimePicker,
  QuarterPicker: AntDatePicker.QuarterPicker,
  MonthPicker: AntDatePicker.MonthPicker,
  WeekPicker: AntDatePicker.WeekPicker,
  YearPicker: AntDatePicker.YearPicker,
});

