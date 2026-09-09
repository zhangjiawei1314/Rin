import type { QueueTask } from "./queue";

declare global {
  interface Env {
    TASK_QUEUE?: Queue<QueueTask>;
    R2_BUCKET?: R2Bucket;
    /** 站点公开访问地址（可选）。未设置时 sitemap/robots 回退到请求来源 origin */
    FRONTEND_URL?: string;
    /** 图片存储后端：`imgbb` 时走 imgbb 图片托管（优先级最高）；缺省时按 R2/S3 是否配置决定 */
    STORAGE_PROVIDER?: string;
    /** imgbb 图片托管 API key（STORAGE_PROVIDER=imgbb 时使用） */
    IMGBB_API_KEY?: string;
  }
}

export {};
