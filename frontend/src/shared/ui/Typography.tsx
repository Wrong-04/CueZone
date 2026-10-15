import { Typography as AntTypography } from 'antd';
import type { TypographyProps as AntTypographyProps } from 'antd/es/typography/Typography';
import clsx from 'clsx';
import type { FC } from 'react';

/**
 * Props của component Typography (thừa hưởng từ Ant Design TypographyProps).
 */
export type TypographyProps = AntTypographyProps;

type CompoundedTypography = FC<TypographyProps> & {
  Text: typeof AntTypography.Text;
  Title: typeof AntTypography.Title;
  Paragraph: typeof AntTypography.Paragraph;
  Link: typeof AntTypography.Link;
};

/**
 * Định dạng văn bản chuẩn (Typography):
 * Cung cấp các thẻ văn bản có style đồng bộ trong hệ thống: `Typography.Title` (tiêu đề), `Typography.Text` (đoạn text), `Typography.Paragraph` (đoạn văn), `Typography.Link` (đường dẫn liên kết).
 */
export const Typography: CompoundedTypography = Object.assign(
  (({ className, ...props }: TypographyProps) => (
    <AntTypography className={clsx(className)} {...props} />
  )) as FC<TypographyProps>,
  {
    Text: AntTypography.Text,
    Title: AntTypography.Title,
    Paragraph: AntTypography.Paragraph,
    Link: AntTypography.Link,
  },
);
