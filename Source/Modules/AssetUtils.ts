import { writeFileSync } from "fs";
import path from "path";
import { v4 } from "uuid";

export function ValidBaseURL(URL: string) {
	return /^data:image\/png;base64,/g.test(URL);
}

export function URLToBuffer(URL: string) {
    return Buffer.from(URL.split(",")[1], "base64");
}

export async function Upload(RawImageString: string) {
	const ImgBlob = URLToBuffer(RawImageString);
	const ID = v4().replaceAll("-", "");

	await writeFileSync(path.join(__dirname + `\\..\\Assets/${ID}.png`), ImgBlob);

	return ID;
}