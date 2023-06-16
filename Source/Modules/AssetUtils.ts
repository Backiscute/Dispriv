import { writeFileSync, existsSync, mkdirSync, rmSync } from "fs";
import path from "path";
import { v4 } from "uuid";
import sharp from "sharp";

export function ValidBaseURL(URL: string) {
	return /^data:image\/png;base64,/g.test(URL);
}

export function URLToBuffer(URL: string) {
    return Buffer.from(URL.split(",")[1], "base64");
}

export async function Upload(RawImageString: string) {
	const ImgBlob = URLToBuffer(RawImageString);
	const ID = v4().replaceAll("-", "");

	const Buffer = await sharp(ImgBlob).webp({ quality: 80 }).toBuffer();

	//console.log(Buffer);

	if (!existsSync(path.join(__dirname + "\\..\\Assets/")))
		mkdirSync(path.join(__dirname + "\\..\\Assets/"));

	await writeFileSync(path.join(__dirname + `\\..\\Assets/${ID}.webp`), Buffer);

	return ID;
}

export async function Remove(ID: string) {
	if (!existsSync(path.join(__dirname + `\\..\\Assets/${ID}.webp`)))
		return;

	await rmSync(path.join(__dirname + `\\..\\Assets/${ID}.webp`));
}