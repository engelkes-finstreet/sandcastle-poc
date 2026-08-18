"use server";

import { DocumentExchangeService } from "@/features/documentExchange/backend/server";
import { calculateFileChecksum } from "@/shared/utils/calculateFileChecksum";
import { uploadFileToGoogle } from "@/shared/utils/uploadFileToGoogle";

type UploadDocumentResult =
  | {
      success: false;
      error: {
        message?: string;
      };
    }
  | {
      success: true;
    };

export async function documentExchangeUploadAction(
  files: File[],
  financingCaseId: string,
  documentRequestId?: string,
): Promise<UploadDocumentResult> {
  for (const file of files) {
    const checksum = await calculateFileChecksum(file);

    if (documentRequestId) {
      const fileUploadResult = await DocumentExchangeService.uploadDocument({
        pathVariables: { financingCaseId },
        payload: {
          documentRequestId,
          blob: {
            filename: file.name,
            checksum,
            contentType: file.type,
            byteSize: file.size,
          },
        },
      });

      if (fileUploadResult.success) {
        const uploadUrl = fileUploadResult.data.blob.directUpload.url;
        const uploadHeaders = fileUploadResult.data.blob.directUpload.headers;

        //uploadFileToGoogle will throw an error because uploadDocument is a mock function
        const uploadResult = await uploadFileToGoogle({
          file,
          directUploadUrl: uploadUrl,
          headers: uploadHeaders,
        });

        if (!uploadResult.success) {
          return {
            success: uploadResult.success,
            error: { message: uploadResult.message },
          };
        }
      } else {
        return {
          success: fileUploadResult.success,
          error: { message: fileUploadResult.error.message },
        };
      }
    } else {
      return {
        success: false,
        error: { message: "No documentRequestId provided!" },
      };
    }
  }

  return { success: true };
}
