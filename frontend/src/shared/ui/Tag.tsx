import { Tag as AntTag, type TagProps as AntTagProps } from "antd";
import clsx from "clsx";
import type { FC } from "react";

export type TagProps = AntTagProps;

type CompoundedTag = FC<TagProps> & {
  CheckableTag: typeof AntTag.CheckableTag;
};

export const Tag: CompoundedTag = Object.assign(
  (({ className, ...props }: TagProps) => (
    <AntTag className={clsx("font-medium", className)} {...props} />
  )) as FC<TagProps>,
  {
    CheckableTag: AntTag.CheckableTag,
  },
);
