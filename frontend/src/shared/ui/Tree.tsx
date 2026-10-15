import { Tree as AntTree, type TreeProps as AntTreeProps } from 'antd';
import clsx from 'clsx';

/**
 * Props của component Tree (thừa hưởng từ Ant Design TreeProps).
 */
export type TreeProps = AntTreeProps;

const InternalTree = ({ className, ...props }: TreeProps) => (
  <AntTree className={clsx(className)} {...props} />
);

/**
 * Cây thư mục / cấu trúc phân cấp (Tree):
 * Dùng để hiển thị dữ liệu dạng cây có quan hệ cha-con (như phân cấp phòng ban, cây danh mục, cây thư mục tệp tin).
 * Tích hợp sẵn `Tree.DirectoryTree`.
 */
export const Tree = Object.assign(InternalTree, {
  DirectoryTree: AntTree.DirectoryTree,
});
