import { Upload as AntUpload, type UploadProps as AntUploadProps } from "antd";
import type { FC } from "react";

export type UploadProps = AntUploadProps;

type CompoundedUpload = FC<UploadProps> & {
  Dragger: typeof AntUpload.Dragger;
  LIST_IGNORE: typeof AntUpload.LIST_IGNORE;
};

export const Upload: CompoundedUpload = Object.assign(
  ((props: UploadProps) => <AntUpload {...props} />) as FC<UploadProps>,
  {
    Dragger: AntUpload.Dragger,
    LIST_IGNORE: AntUpload.LIST_IGNORE,
  },
);
