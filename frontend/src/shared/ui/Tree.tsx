import { Tree as AntTree, type TreeProps as AntTreeProps } from "antd";
import clsx from "clsx";

export type TreeProps = AntTreeProps;

const InternalTree = ({ className, ...props }: TreeProps) => (
  <AntTree className={clsx(className)} {...props} />
);

export const Tree = Object.assign(InternalTree, {
  DirectoryTree: AntTree.DirectoryTree,
});
