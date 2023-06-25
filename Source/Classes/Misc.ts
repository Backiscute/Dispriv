export const VideoFileTypes = ["avi", "mp4", "mpeg", "ogv", "webm"] as const;
export const VideoContentTypes = ["video/x-msvideo", "video/mp4", "video/mpeg", "video/ogg", "video/webm"] as const;
export const PhotoFileTypes = ["avif", "webp", "jpeg", "png", "gif", "tiff"] as const;
export const PhotoContentTypes = ["image/avif", "image/webp", "image/svg+xml", "image/bmp","image/jpeg","image/x-png","image/png","image/gif", "image/tiff"] as const;
export const PhotoMap = {
    avif: ["image/avif"],
    webp: ["image/webp"],
    jpeg: ["image/jpeg"],
    jpg: ["image/jpg"],
    png: ["image/x-png", "image/png"],
    tiff: ["image/tiff"]
} as const;