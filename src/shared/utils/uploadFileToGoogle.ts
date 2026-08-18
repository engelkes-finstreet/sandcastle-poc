import { getExtracted } from "next-intl/server";

export async function uploadFileToGoogle({
  file,
  directUploadUrl,
  headers,
}: {
  file: File;
  directUploadUrl: string;
  headers: Record<string, string>;
}): Promise<{ success: true } | { success: false; message: string }> {
  const t = await getExtracted();

  try {
    const _response = await fetch(directUploadUrl, {
      method: "PUT",
      headers: {
        "Content-MD5": headers["contentMd5"]!,
        "Content-Disposition": headers["contentDisposition"]!,
        "Cache-Control": headers["cacheControl"]!,
      },
      body: file,
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error({ error });
    return {
      success: false,
      message: t("Ein Fehler ist aufgetreten. Bitte versuchen Sie es später noch einmal."),
    };
  }
}
