import cloudinary from "../config/cloudinary";
import logger from "./logger";

export const uploadToCloudinary = async (
  fileBuffer: Buffer,
  folder: string,
): Promise<{ url: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `library/${folder}`,
        resource_type: "image",
        transformation: [
          { width: 800, height: 1200, crop: "limit" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error || !result) {
          logger.error("Cloudinary upload failed", { error });
          return reject(error);
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(fileBuffer);
  });
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
    logger.info(`Cloudinary file deleted: ${publicId}`);
  } catch (error) {
    logger.error("Cloudinary delete failed", { error, publicId });
  }
};
