import { createHash } from "crypto";

export async function calculateFileChecksum(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const md5 = createHash("md5").update(Buffer.from(arrayBuffer)).digest();

  return md5.toString("base64");
}
