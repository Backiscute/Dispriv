import { writeFileSync, existsSync, mkdirSync, rmSync, renameSync, statSync, watchFile, unwatchFile } from "fs";
import path from "path";
import { v4 } from "uuid";
import sharp from "sharp";
import { glob } from "glob";
import imageSize from "image-size";
import ffmpeg from "fluent-ffmpeg";
import { path as ffprobeBinary} from "ffprobe-static";
import ffmpegBinary from "ffmpeg-static";
import { Folders, PhotoContentTypes, VideoContentTypes } from "../Classes/Misc";

ffmpeg.setFfprobePath(ffprobeBinary);
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ffmpeg.setFfmpegPath(ffmpegBinary!);

export function ValidBaseURL(URL: string) {
    return /^data:(image\/png|image\/jpeg|application\/octet-stream);base64,/g.test(URL);
}

export function URLToBuffer(URL: string) {
    return Buffer.from(URL.split(",")[1], "base64");
}

export async function GetFirstFrame(FilePath: string, OutputPath: string) {
    await new Promise<void>((resolve, reject) => {
        try {
            ffmpeg(FilePath).outputOptions("-vf", "select=eq(n\\,0)", "-q:v", "3").output(OutputPath).run();
            watchFile(OutputPath, (curr) => {
                if (curr.ctimeMs !== new Date("1970-01-01T00:00:00.000").getTime()) {
                    unwatchFile(OutputPath);
                    resolve();
                }
            });
        } catch (e) {
            reject(e);
        }
    });
}

export async function Upload(RawImageString: string, Directory: Folders, FileName?: string) {
    const ImgBlob = URLToBuffer(RawImageString);
    const ID = FileName ? FileName : v4().replaceAll("-", "");

    const Buffer = await sharp(ImgBlob).webp({ quality: 80 }).toBuffer();

    if (!existsSync(path.join(__dirname, "..", "Assets", Directory))) mkdirSync(path.join(__dirname, "..", "Assets", Directory), {
        recursive: true
    });

    writeFileSync(path.join(__dirname, "..", "Assets", Directory, ID), Buffer);

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
    
    if ((PhotoContentTypes as unknown as string[]).includes(ContentType)) {
        const ImageDimensions = imageSize(FilePath);
        ImageOrVideoSize.height = ImageDimensions.height;
        ImageOrVideoSize.width = ImageDimensions.width;
    }
    if ((VideoContentTypes as unknown as string[]).includes(ContentType)) {
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
    if ((VideoContentTypes as unknown as string[]).includes(ContentType)) {
        const ThumbnailPath = path.join(__dirname, "..", "Assets", "Attachments", `${NewFilename.split(".")[0]}.jpeg`);
        await GetFirstFrame(NewFilePath, ThumbnailPath);
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