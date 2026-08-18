import * as z from "@/lib/zod";

export const MemberRoleSchema = z.enum([
  "Administration::Admin",
  "PropertyManagement::PropertyManager",
  "PropertyManagement::Scalara",
  "PropertyManagement::Admin",
  "FinancialServiceProvider::Admin",
  "FinancialServiceProvider::Processor",
  "FinancialServiceProvider::MasterDataManager",
]);

export const PermissionsSchema = z.object({
  someAction: z.boolean(),
  financingCase: z.object({
    manageAssignments: z.boolean(),
    read: z.boolean(),
    list: z.boolean(),
    requestDocument: z.boolean(),
    editDetails: z.boolean(),
    placeOffer: z.boolean(),
    readOffer: z.boolean(),
    manageSignatureProcess: z.boolean(),
    manageInternalRemark: z.boolean(),
    archive: z.boolean(),
    destroyDocument: z.boolean(),
    manageFspDocuments: z.boolean(),
    manageDocumentArchival: z.boolean(),
    performMarketValueIndication: z.boolean(),
    requestCrefoReport: z.boolean(),
    viewCrefoReport: z.boolean(),
    manageRiskAssessments: z.boolean(),
  }),
  financingInquiry: z.object({
    create: z.boolean(),
  }),
  masterData: z.object({
    manage: z.boolean(),
  }),
  administration: z.object({
    manageMembers: z.boolean(),
    searchMembers: z.boolean(),
    onboardOrganizable: z.boolean(),
  }),
  roles: z.array(MemberRoleSchema),
});

export type Permissions = z.infer<typeof PermissionsSchema>;
export type MemberRole = z.infer<typeof MemberRoleSchema>;
