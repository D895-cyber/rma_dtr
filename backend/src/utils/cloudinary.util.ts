import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import fs from 'fs';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  secureUrl: string;
  width?: number;
  height?: number;
  format: string;
  bytes: number;
}

/**
 * Upload file to Cloudinary
 */
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
}

export async function uploadToCloudinary(
  file: MulterFile | { buffer: Buffer; originalname: string; mimetype: string },
  folder: string,
  fileType: 'image' | 'log' | 'document' = 'document'
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadOptions: any = {
      folder: `crm/${folder}`,
      resource_type: fileType === 'image' ? 'image' : 'raw',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    };

    // For images, add optimization
    if (fileType === 'image') {
      uploadOptions.quality = 'auto';
      uploadOptions.fetch_format = 'auto';
    }

    // Convert buffer to stream
    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
          return;
        }

        if (!result) {
          reject(new Error('Upload failed: No result from Cloudinary'));
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          secureUrl: result.secure_url,
          width: result.width,
          height: result.height,
          format: result.format || 'unknown',
          bytes: result.bytes,
        });
      }
    );

    // Handle different file input types
    // Multer with diskStorage saves to disk, so we need to read the file
    const multerFile = file as MulterFile;
    
    if (multerFile.buffer) {
      // File is in memory (memoryStorage)
      const readableStream = new Readable();
      readableStream.push(multerFile.buffer);
      readableStream.push(null);
      readableStream.pipe(stream);
    } else if (multerFile.path && fs.existsSync(multerFile.path)) {
      // File is on disk (diskStorage) - read it and pipe to Cloudinary
      const fileStream = fs.createReadStream(multerFile.path);
      fileStream.pipe(stream);
      fileStream.on('error', (err: Error) => {
        reject(new Error(`Failed to read file: ${err.message}`));
      });
    } else if ((file as any).buffer) {
      // Fallback: try buffer from generic file object
      const fileBuffer = (file as any).buffer;
      const readableStream = new Readable();
      readableStream.push(fileBuffer);
      readableStream.push(null);
      readableStream.pipe(stream);
    } else {
      reject(new Error('Invalid file format: No buffer or path found'));
    }
  });
}

/**
 * Delete file from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string, resourceType: 'image' | 'raw' = 'image'): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
}

/**
 * Get optimized image URL
 */
export function getOptimizedImageUrl(publicId: string, options?: {
  width?: number;
  height?: number;
  quality?: string;
  format?: string;
}): string {
  const transformations: string[] = [];

  if (options?.width) transformations.push(`w_${options.width}`);
  if (options?.height) transformations.push(`h_${options.height}`);
  if (options?.quality) transformations.push(`q_${options.quality}`);
  if (options?.format) transformations.push(`f_${options.format}`);

  const transformString = transformations.length > 0 ? transformations.join(',') + '/' : '';
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [{ ...options }],
  });
}

/**
 * Get thumbnail URL for image
 */
export function getThumbnailUrl(publicId: string, size: number = 200): string {
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      {
        width: size,
        height: size,
        crop: 'fill',
        quality: 'auto',
        format: 'auto',
      },
    ],
  });
}

export default cloudinary;

