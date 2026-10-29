import { Image as AntImage, type ImageProps as AntImageProps } from "antd";
import type { FC } from "react";

export type ImageProps = AntImageProps;

type CompoundedImage = FC<ImageProps> & { PreviewGroup: typeof AntImage.PreviewGroup };

export const Image: CompoundedImage = Object.assign(
  ((props: ImageProps) => <AntImage {...props} />) as FC<ImageProps>,
  { PreviewGroup: AntImage.PreviewGroup },
);
