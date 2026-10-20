import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

const getCloudinaryClient = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw Object.assign(new Error("Thiếu cấu hình Cloudinary trong file .env"), {
      httpCode: 503,
    });
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return cloudinary;
};

export const uploadProductImage = (buffer: Buffer): Promise<UploadApiResponse> => {
  const client = getCloudinaryClient();

  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        folder: "cuezone/products",
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [
          { width: 1600, height: 1600, crop: "limit" },
          { quality: "auto:good", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result) {
          reject(new Error("Cloudinary không trả về kết quả tải ảnh"));
          return;
        }

        resolve(result);
      },
    );

    stream.end(buffer);
  });
};
