import React, { useState } from "react";
import { CameraOutlined } from "@ant-design/icons";
import { Button, Input, Upload, message } from "../../../../shared/ui";
import { productService } from "../../../../services/product.service";

/**
 * Component: FnbImageUploader
 * Chức năng: Quản lý chọn và tải ảnh đại diện món ăn/thức uống F&B:
 * - Xem trước ảnh đại diện (Preview), hỗ trợ nút xóa ảnh nhanh.
 * - Tải ảnh trực tiếp từ máy tính lên server lưu trữ thông qua `productService.uploadDirect`.
 * - Hỗ trợ dán đường dẫn ảnh trực tiếp từ link web (URL).
 */
interface FnbImageUploaderProps {
  image?: string;
  onChangeImage: (url: string) => void;
}

export const FnbImageUploader: React.FC<FnbImageUploaderProps> = ({
  image,
  onChangeImage,
}) => {
  const [isUploading, setIsUploading] = useState(false);

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3.5">
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-slate-200 shadow-2xs shrink-0 bg-white group">
          {image ? (
            <>
              <img src={image} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                title="Xóa ảnh (để trống)"
                onClick={() => onChangeImage("")}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
              <CameraOutlined className="text-xl text-slate-300 mb-0.5" />
              <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap">Chưa có ảnh</span>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <span className="block text-xs font-bold text-slate-700 whitespace-nowrap">
            Hình ảnh đại diện món:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Upload
              showUploadList={false}
              accept="image/*"
              beforeUpload={async (file) => {
                try {
                  setIsUploading(true);
                  const res = await productService.uploadDirect(file);
                  onChangeImage(res.imageUrl);
                  message.success("Tải ảnh lên thành công!");
                } catch (err: any) {
                  message.error(err?.message || "Không thể tải ảnh lên. Vui lòng thử lại.");
                } finally {
                  setIsUploading(false);
                }
                return Upload.LIST_IGNORE;
              }}
            >
              <Button
                variant="outline"
                size="sm"
                leftIcon={<CameraOutlined />}
                loading={isUploading}
                className="!rounded-xl !text-xs !border-emerald-300 !text-emerald-700 hover:!bg-emerald-50 font-bold !h-8 !px-3 whitespace-nowrap"
              >
                {isUploading ? "Đang tải ảnh lên..." : "Tải ảnh từ thiết bị"}
              </Button>
            </Upload>

            <Input
              placeholder="Hoặc dán link ảnh web (https://...)"
              value={image || ""}
              onChange={(e) => onChangeImage(e.target.value)}
              className="!h-8 !rounded-xl text-xs flex-1 min-w-[200px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
