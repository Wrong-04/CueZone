import { Typography as AntTypography } from "antd";
import type { TypographyProps as AntTypographyProps } from "antd/es/typography/Typography";
import clsx from "clsx";
import type { FC } from "react";

export type TypographyProps = AntTypographyProps;

type CompoundedTypography = FC<TypographyProps> & {
  Text: typeof AntTypography.Text;
  Title: typeof AntTypography.Title;
  Paragraph: typeof AntTypography.Paragraph;
  Link: typeof AntTypography.Link;
};

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
