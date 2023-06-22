import { writeFileSync, existsSync, mkdirSync, rmSync, renameSync, statSync } from "fs";
import path from "path";
import { v4 } from "uuid";
import sharp from "sharp";
import { glob } from "glob";
import imageSize from "image-size";
import ffmpeg from "fluent-ffmpeg";
import { path as ffprobeBinary} from "ffprobe-static";
import ffmpegBinary from "ffmpeg-static";

ffmpeg.setFfprobePath(ffprobeBinary);
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ffmpeg.setFfmpegPath(ffmpegBinary!);

export function ValidBaseURL(URL: string) {
    return /^data:image\/png;base64,/g.test(URL);
}

export function URLToBuffer(URL: string) {
    return Buffer.from(URL.split(",")[1], "base64");
}

export function CreateFirstFrame(FilePath: string, OutputPath: string) {
    ffmpeg(FilePath).outputOptions("-vf", "select=eq(n\\,0)", "-q:v", "3").output(OutputPath).run();
}

export async function Upload(RawImageString: string, ToWebp = true) {
    const ImgBlob = URLToBuffer(RawImageString);
    const ID = v4().replaceAll("-", "");

    const Buffer = ToWebp ? await sharp(ImgBlob).webp({ quality: 80 }).toBuffer() : ImgBlob;

    if (!existsSync(path.join(__dirname, "..", "Assets"))) mkdirSync(path.join(__dirname, "..", "Assets"));

    writeFileSync(path.join(__dirname, "..", "Assets", `${ID}.${ToWebp ? "webp" : "png"}`), Buffer);

    return ID;
}

export function UploadAttachment(RawData: Buffer, ContentType: string, Filename: string) {
    if (!existsSync(path.join(__dirname, "..", "Assets", "Attachments"))) mkdirSync(path.join(__dirname, "..", "Assets", "Attachments"));

    writeFileSync(path.join(__dirname, "..", "Assets", "Attachments", `${encodeURIComponent(ContentType)}_${Filename}`), RawData);

    return `${ContentType}_${Filename}`;
}

export function FindAttachment(Filename: string): string | undefined {
    const File = glob.sync(path.join(__dirname, "..", "Assets", "Attachments", `**_${Filename.replace(/(\\|\?|\*|\*\*|\[|\]|!|\(|\))/g, "\\$&")}`).replace(/\\/g, "/"))[0]; 
    
    return File;
}

export async function HandleAttachment(FilePath: string, NewFilename: string) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { size } = statSync(FilePath), ContentType = decodeURIComponent(FilePath.split("\\").at(-1)!.split("_")[0]), ImageOrVideoSize: { height: number | undefined; width: number | undefined; } = { height: undefined, width: undefined };
    
    if (["image/avif", "image/webp", "image/svg+xml", "image/bmp","image/jpeg","image/x-png","image/png","image/gif"].includes(ContentType)) {
        const ImageDimensions = imageSize(FilePath);
        ImageOrVideoSize.height = ImageDimensions.height;
        ImageOrVideoSize.width = ImageDimensions.width;
    }
    if (["video/x-msvideo", "video/mp4", "video/mpeg", "video/ogg", "video/webm"].includes(ContentType)) {
        const VideoDimensions: { height: number | undefined; width: number | undefined; } = await new Promise(resolve => {
            ffmpeg.ffprobe(FilePath, (err, data) => {
                if (err) resolve({ height: undefined, width: undefined });
                else {
                    const VideoStream = data.streams.find(s => s.codec_type === "video"), Rotation = VideoStream?.rotation ? true : false;
                    
                    resolve({
                        height: Rotation ? VideoStream?.width : VideoStream?.height,
                        width: Rotation ? VideoStream?.height : VideoStream?.width,
                    });
                }
            });
        });
        
        ImageOrVideoSize.height = VideoDimensions.height;
        ImageOrVideoSize.width = VideoDimensions.width;
    }
    
    const NewFilePath = path.join(__dirname, "..", "Assets", "Attachments", NewFilename);
    renameSync(FilePath, NewFilePath);
    if (["video/x-msvideo", "video/mp4", "video/mpeg", "video/ogg", "video/webm"].includes(ContentType)) {
        const ThumbnailPath = path.join(__dirname, "..", "Assets", "Attachments", `${NewFilename.split(".")[0]}.jpg`);
        CreateFirstFrame(NewFilePath, ThumbnailPath);
    }

    return {
        Size: size,
        ContentType,
        ImageOrVideoSize
    };
}

export function Remove(ID: string) {
    if (existsSync(path.join(__dirname, "..", "Assets", `${ID}.webp`)))
        rmSync(path.join(__dirname, "..", "Assets", `${ID}.webp`));

    if (existsSync(path.join(__dirname, "..", "Assets", `${ID}.png`)))
        rmSync(path.join(__dirname, "..", "Assets", `${ID}.png`));
}