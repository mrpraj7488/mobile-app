import { getSupabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system';

export interface FileUploadResult {
  url: string;
  path: string;
  name: string;
  size: number;
  type: string;
}

export class FileUploadService {
  private static instance: FileUploadService;
  private bucketName = 'vidgro-files';
  
  private getSupabaseClient() {
    const client = getSupabase();
    if (!client) {
      throw new Error('Supabase client not initialized. Please ensure the app is properly configured.');
    }
    return client;
  }

  private constructor() {}

  static getInstance(): FileUploadService {
    if (!FileUploadService.instance) {
      FileUploadService.instance = new FileUploadService();
    }
    return FileUploadService.instance;
  }

  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile(
    file: {
      uri: string;
      name: string;
      size: number;
      mimeType: string;
    },
    ticketId: string,
    userId: string
  ): Promise<FileUploadResult> {
    try {
      // Generate organized file path for User-files structure
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop() || 'bin';
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `User-files/support-attachments/${userId}/${ticketId}/${sanitizedFileName}_${timestamp}.${fileExtension}`;

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to Uint8Array for upload
      const binaryString = atob(base64);
      const arrayBuffer = new ArrayBuffer(binaryString.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }

      // Upload to Supabase Storage with metadata
      const { data, error } = await this.getSupabaseClient().storage
        .from(this.bucketName)
        .upload(fileName, uint8Array, {
          contentType: file.mimeType,
          upsert: false,
          cacheControl: '3600',
          metadata: {
            userId: userId,
            ticketId: ticketId,
            fileType: 'support-attachment',
            uploadedAt: new Date().toISOString(),
            originalName: file.name,
            fileSize: file.size.toString()
          }
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = this.getSupabaseClient().storage
        .from(this.bucketName)
        .getPublicUrl(fileName);

      return {
        url: urlData.publicUrl,
        path: fileName,
        name: file.name,
        size: file.size,
        type: file.mimeType,
      };
    } catch (error) {
      
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: {
      uri: string;
      name: string;
      size: number;
      mimeType: string;
    }[],
    ticketId: string,
    userId: string
  ): Promise<FileUploadResult[]> {
    const uploadPromises = files.map(file =>
      this.uploadFile(file, ticketId, userId)
    );
    
    return Promise.all(uploadPromises);
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const { error } = await this.getSupabaseClient().storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      
      return false;
    }
  }

  /**
   * Get download URL for a file
   */
  async getDownloadUrl(filePath: string): Promise<string | null> {
    try {
      const { data, error } = await this.getSupabaseClient().storage
        .from(this.bucketName)
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) {
        throw error;
      }

      return data.signedUrl;
    } catch (error) {
      
      return null;
    }
  }

  /**
   * Check if storage bucket exists and create if not
   */
  async ensureBucketExists(): Promise<void> {
    try {
      const { data: buckets, error: listError } = await this.getSupabaseClient().storage
        .listBuckets();

      if (listError) {
        throw listError;
      }

      const bucketExists = buckets?.some((b: any) => b.name === this.bucketName);

      if (!bucketExists) {
        const { error: createError } = await this.getSupabaseClient().storage
          .createBucket(this.bucketName, {
            public: true,
            fileSizeLimit: 5242880, // 5MB
            allowedMimeTypes: [
              'image/*',
              'application/pdf',
              'text/*',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ],
          });

        if (createError && !createError.message.includes('already exists')) {
          throw createError;
        }
      }
    } catch (error) {
      
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file: { size: number; mimeType: string }): {
    valid: boolean;
    error?: string;
  } {
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return {
        valid: false,
        error: 'File size must be less than 5MB',
      };
    }

    // Check mime type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    const isAllowed = allowedTypes.some(type => 
      file.mimeType.startsWith(type.split('/')[0])
    );

    if (!isAllowed) {
      return {
        valid: false,
        error: 'File type not supported',
      };
    }

    return { valid: true };
  }
}

export default FileUploadService.getInstance();
