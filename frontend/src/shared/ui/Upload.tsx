import { Upload as AntUpload, type UploadProps as AntUploadProps } from 'antd';
import type { FC } from 'react';

/**
 * Props của component Upload (thừa hưởng từ Ant Design UploadProps).
 */
export type UploadProps = AntUploadProps;

type CompoundedUpload = FC<UploadProps> & {
  Dragger: typeof AntUpload.Dragger;
  LIST_IGNORE: typeof AntUpload.LIST_IGNORE;
};

/**
 * Tải lên tệp tin / tài liệu (Upload):
 * Dùng để chọn file đính kèm, hình ảnh giám định, chứng từ bồi thường.
 * Hỗ trợ `Upload.Dragger` cho thao tác kéo-thả tệp tin vào khung.
 */
export const Upload: CompoundedUpload = Object.assign(
  ((props: UploadProps) => <AntUpload {...props} />) as FC<UploadProps>,
  {
    Dragger: AntUpload.Dragger,
    LIST_IGNORE: AntUpload.LIST_IGNORE,
  },
);
