import { Image as AntImage, type ImageProps as AntImageProps } from 'antd';
import type { FC } from 'react';

export type ImageProps = AntImageProps;

type CompoundedImage = FC<ImageProps> & { PreviewGroup: typeof AntImage.PreviewGroup };

/**
 * Ảnh có preview phóng to (AntD). Lớp mỏng để feature không import `antd`
 * trực tiếp; dùng cho thumbnail trong danh sách tài liệu, click xem lớn qua
 * lightbox có sẵn — không tự dựng modal xem ảnh riêng (11.7).
 */
export const Image: CompoundedImage = Object.assign(
  ((props: ImageProps) => <AntImage {...props} />) as FC<ImageProps>,
  { PreviewGroup: AntImage.PreviewGroup },
);
