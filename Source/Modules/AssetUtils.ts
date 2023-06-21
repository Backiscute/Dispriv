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

export async function Upload(RawImageString: string, ToWebp = true) {
	const ImgBlob = URLToBuffer(RawImageString);
	const ID = v4().replaceAll("-", "");

	const Buffer = ToWebp ? await sharp(ImgBlob).webp({ quality: 80 }).toBuffer() : ImgBlob;

	if (!existsSync(path.join(__dirname + "\\..\\Assets/")))
		mkdirSync(path.join(__dirname + "\\..\\Assets/"));

	writeFileSync(path.join(__dirname + `\\..\\Assets/${ID}.${ToWebp ? "webp" : "png"}`), Buffer);

	return ID;
}

export function Remove(ID: string) {
	if (existsSync(path.join(__dirname + `\\..\\Assets/${ID}.webp`)))
		rmSync(path.join(__dirname + `\\..\\Assets/${ID}.webp`));
	
	if (existsSync(path.join(__dirname + `\\..\\Assets/${ID}.png`)))
		rmSync(path.join(__dirname + `\\..\\Assets/${ID}.png`));
}