import { NextResponse } from "next/server";
import { registerMock } from "@/shared/backend/mocks/registry";

type MockDocument = {
  id: string;
  filename: string;
  contentType: string;
  byteSize: number;
  createdAt: string;
  downloadable: boolean;
  tags: Array<{ value: string; human: string; severity: string }>;
};

type MockDocumentRequest = {
  id: string;
  title: string;
  description: string;
  required: boolean;
  contentTypes: string[];
  requestGroup?: { title: string };
  documents: MockDocument[];
};

// Module-level state — persists across requests within the same server process
const documentRequests: MockDocumentRequest[] = [
  {
    id: "req-001",
    title: "Jahresabschluss",
    description: "Bitte laden Sie den aktuellen Jahresabschluss hoch.",
    required: true,
    contentTypes: ["application/pdf"],
    requestGroup: { title: "Finanzunterlagen" },
    documents: [
      {
        id: "doc-001",
        filename: "jahresabschluss-2023.pdf",
        contentType: "application/pdf",
        byteSize: 204800,
        createdAt: "2024-03-15T10:00:00Z",
        downloadable: true,
        tags: [{ value: "verified", human: "Geprüft", severity: "success" }],
      },
    ],
  },
  {
    id: "req-002",
    title: "Personalausweis",
    description: "Bitte laden Sie eine Kopie Ihres Personalausweises hoch.",
    required: true,
    contentTypes: ["application/pdf", "image/jpeg", "image/png"],
    requestGroup: { title: "Personaldokumente" },
    documents: [],
  },
  {
    id: "req-003",
    title: "Kontoauszüge",
    description: "Bitte laden Sie die letzten 3 Kontoauszüge hoch.",
    required: false,
    contentTypes: ["application/pdf"],
    requestGroup: { title: "Finanzunterlagen" },
    documents: [
      {
        id: "doc-002",
        filename: "kontoauszug-januar-2024.pdf",
        contentType: "application/pdf",
        byteSize: 102400,
        createdAt: "2024-03-10T09:30:00Z",
        downloadable: true,
        tags: [],
      },
    ],
  },
  {
    id: "req-004",
    title: "Gewerbeanmeldung",
    description: "Bitte laden Sie die Gewerbeanmeldung hoch.",
    required: true,
    contentTypes: ["application/pdf"],
    documents: [],
  },
];

// GET /financing_cases/{financingCaseId}/document_exchange/requests_with_documents
registerMock({
  method: "GET",
  pathPattern:
    "/financing_cases/{financingCaseId}/document_exchange/requests_with_documents",
  handler: (_req, _params) => {
    return NextResponse.json({
      data: {
        header: { companyName: "Mustermann GmbH" },
        flags: { editable: true },
        documentRequests,
      },
    });
  },
});

// POST /financing_cases/{financingCaseId}/document_exchange/direct_upload
// Payload (snake_case due to payloadTransformer): { document_request_id, blob: { filename, content_type, byte_size } }
registerMock({
  method: "POST",
  pathPattern:
    "/financing_cases/{financingCaseId}/document_exchange/direct_upload",
  handler: async (req, _params) => {
    const body = await req.json();
    const documentId = `doc-${Date.now()}`;

    const request = documentRequests.find(
      (r) => r.id === body.document_request_id,
    );

    if (request) {
      request.documents.push({
        id: documentId,
        filename: body.blob?.filename ?? "unknown",
        contentType: body.blob?.content_type ?? "application/octet-stream",
        byteSize: body.blob?.byte_size ?? 0,
        createdAt: new Date().toISOString(),
        downloadable: true,
        tags: [],
      });
    }

    return NextResponse.json({
      data: {
        documentId,
        blob: {
          directUpload: {
            url: `https://storage.example.com/upload/${documentId}`,
            headers: { "Content-Type": "application/octet-stream" },
          },
        },
      },
    });
  },
});

// DELETE /financing_cases/{financingCaseId}/document_exchange/{documentId}
registerMock({
  method: "DELETE",
  pathPattern:
    "/financing_cases/{financingCaseId}/document_exchange/{documentId}",
  handler: (_req, params) => {
    for (const request of documentRequests) {
      const index = request.documents.findIndex(
        (d) => d.id === params.documentId,
      );
      if (index !== -1) {
        request.documents.splice(index, 1);
        break;
      }
    }
    return new NextResponse(null, { status: 204 });
  },
});

// GET /financing_cases/{financingCaseId}/document_exchange/{documentId}/download
registerMock({
  method: "GET",
  pathPattern:
    "/financing_cases/{financingCaseId}/document_exchange/{documentId}/download",
  handler: (_req, params) => {
    return NextResponse.json({
      data: {
        documentId: params.documentId,
        downloadUrl: `https://storage.example.com/download/${params.documentId}?token=mock-token`,
      },
    });
  },
});
