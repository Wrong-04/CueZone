import { Space as AntSpace, type SpaceProps as AntSpaceProps } from "antd";
import clsx from "clsx";
import type { FC } from "react";

export type SpaceProps = AntSpaceProps;

type CompoundedSpace = FC<SpaceProps> & { Compact: typeof AntSpace.Compact };

export const Space: CompoundedSpace = Object.assign(
  (({ className, ...props }: SpaceProps) => (
    <AntSpace className={clsx(className)} {...props} />
  )) as FC<SpaceProps>,
  { Compact: AntSpace.Compact },
);
