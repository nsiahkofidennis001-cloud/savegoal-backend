import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.config.js';

const supabaseUrl = env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_ANON_KEY;
const bucketName = env.SUPABASE_STORAGE_BUCKET;

const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;

export interface UploadOptions {
    path: string;
    file: Buffer | Uint8Array | Blob | string;
    contentType?: string;
    isPublic?: boolean;
}

export class StorageClient {
    static async upload(options: UploadOptions) {
        if (!supabase) {
            console.warn('⚠️ Supabase Storage not configured. Mocking upload.');
            return {
                path: options.path,
                url: `https://mock-storage.com/${bucketName}/${options.path}`,
                fullPath: `${bucketName}/${options.path}`
            };
        }

        const { path, file, contentType, isPublic = false } = options;

        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(path, file, {
                contentType,
                upsert: true
            });

        if (error) {
            console.error('❌ Supabase Upload Error:', error.message);
            throw new Error(`Upload failed: ${error.message}`);
        }

        const url = isPublic
            ? supabase.storage.from(bucketName).getPublicUrl(data.path).data.publicUrl
            : (await supabase.storage.from(bucketName).createSignedUrl(data.path, 3600)).data?.signedUrl;

        return {
            path: data.path,
            url,
            fullPath: data.fullPath
        };
    }

    static async getSignedUrl(path: string, expiresIn = 3600) {
        if (!supabase) return `https://mock-storage.com/${bucketName}/${path}`;

        const { data, error } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(path, expiresIn);

        if (error) {
            console.error('❌ Supabase Signed URL Error:', error.message);
            return null;
        }

        return data.signedUrl;
    }
}
