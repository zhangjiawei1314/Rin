import { Hono } from "hono";
import type { AppContext } from "../core/hono-types";
import { profileAsync } from "../core/server-timing";
import { getStorageObject, putStorageObject } from "../utils/storage";

const IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload";

function buf2hex(buffer: ArrayBuffer) {
    return [...new Uint8Array(buffer)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * 未配置 R2 / S3 时，把文件转发到 imgbb 图片托管。
 * 返回直链 url，契约与 S3/R2 分支一致：`{ url }`。
 */
export async function uploadToImgbb(file: File, apiKey: string): Promise<string> {
    const form = new FormData();
    form.append("key", apiKey);
    // 优先带原始文件名，imgbb 会自动检测
    form.append("image", file, file.name);

    const res = await fetch(IMGBB_UPLOAD_URL, {
        method: "POST",
        body: form,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`imgbb upload failed: ${res.status} ${text}`);
    }

    const payload = (await res.json()) as {
        success?: boolean;
        status?: number;
        data?: { url?: string; display_url?: string };
        error?: { message?: string };
    };

    if (!payload.success || !payload.data) {
        throw new Error(payload.error?.message || "imgbb upload returned no image url");
    }

    // 优先直链 url，其次 display_url
    const url = payload.data.url || payload.data.display_url;
    if (!url) {
        throw new Error("imgbb upload returned no image url");
    }

    return url;
}

export function useImgbb(env: Env) {
    // 显式指定 imgbb 时直接走 imgbb；否则仅在没配 R2 和 S3 时兜底走 imgbb
    return env.STORAGE_PROVIDER === "imgbb" || (!env.R2_BUCKET && !env.S3_ENDPOINT);
}

export function StorageService(): Hono {
    const app = new Hono();

    // POST /storage
    app.post('/', async (c: AppContext) => {
        const uid = c.get('uid');
        const env = c.get('env');

        const body = await profileAsync(c, 'storage_parse', () => c.req.parseBody());
        const key = body.key as string;
        const file = body.file as File;

        if (!uid) {
            return c.text('Unauthorized', 401);
        }

        // 未配置 S3/R2（或显式指定 imgbb）：走 imgbb 图片托管
        if (useImgbb(env)) {
            const apiKey = env.IMGBB_API_KEY;
            if (!apiKey) {
                // 与 S3_ENDPOINT 缺失保持一致的报错风格：提示需配置 IMGBB_API_KEY
                console.error('IMGBB_API_KEY is not defined');
                return c.text('IMGBB_API_KEY is not defined', 500);
            }
            try {
                const url = await profileAsync(c, 'storage_imgbb', () => uploadToImgbb(file, apiKey));
                return c.json({ url });
            } catch (e: any) {
                console.error(e.message);
                return c.text(e.message || 'imgbb upload failed', 400);
            }
        }

        const suffix = key.includes(".") ? key.split('.').pop() : "";
        const fileBuffer = await profileAsync(c, 'storage_file_buffer', () => file.arrayBuffer());
        const hashArray = await profileAsync(c, 'storage_hash', () => crypto.subtle.digest(
            { name: 'SHA-1' },
            fileBuffer
        ));
        const hash = buf2hex(hashArray);
        const hashkey = `${hash}.${suffix}`;

        try {
            const result = await profileAsync(c, 'storage_put', () => putStorageObject(env, hashkey, file, file.type, new URL(c.req.url).origin));
            return c.json({ url: result.url });
        } catch (e: any) {
            console.error(e.message);
            const status = e.message?.includes('is not defined') ? 500 : 400;
            return c.text(e.message, status);
        }
    });

    return app;
}

export function BlobService(): Hono {
    const app = new Hono();

    app.get("/*", async (c: AppContext) => {
        const env = c.get("env");
        const key = c.req.path.replace(/^\/blob\/?/, "");

        if (!key) {
            return c.text("Blob key is required", 400);
        }

        try {
            const response = await profileAsync(c, "blob_fetch", () => getStorageObject(env, decodeURIComponent(key)));

            if (!response) {
                return c.text("Not found", 404);
            }

            return new Response(response.body, {
                status: response.status,
                headers: response.headers,
            });
        } catch (error) {
            console.error("Blob fetch failed:", error);
            return c.text("Blob fetch failed", 500);
        }
    });

    return app;
}
