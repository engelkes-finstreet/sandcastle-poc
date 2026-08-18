import * as z from "@/lib/zod";
import {
  SIGNING_GROUP_A,
  SIGNING_GROUP_B,
} from "@/features/signatureProcess/assignSignatures/forms/constants";

export const DepartmentSchema = z.enum([
  "sales",
  "back_office_active",
  "back_office_passive",
  "none",
]);

export type DepartmentType = z.infer<typeof DepartmentSchema>;

export const SigningGroupSchema = z.enum([
  SIGNING_GROUP_A,
  SIGNING_GROUP_B,
  "none",
]);

export type SigningGroupType = z.infer<typeof SigningGroupSchema>;

export const GetDepartmentOptionsResponseSchema = z.array(
  z.object({
    value: DepartmentSchema,
    label: z.string(),
  }),
);

export type GetDepartmentOptionsResponseType = z.infer<
  typeof GetDepartmentOptionsResponseSchema
>;

export const GetSigningGroupOptionsResponseSchema = z.array(
  z.object({
    value: SigningGroupSchema,
    label: z.string(),
  }),
);

export type GetSigningGroupOptionsResponseType = z.infer<
  typeof GetSigningGroupOptionsResponseSchema
>;
