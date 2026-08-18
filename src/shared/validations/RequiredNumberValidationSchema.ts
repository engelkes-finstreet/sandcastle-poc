import * as z from "@/lib/zod";

/*
We need to use this schema to validate that the number is not empty. If we would do something like this:
z.coerce.number().min(0) without the preprocess the form would be valid even if the value is empty.
This is because Number("") and Number(null) both evaluate to 0, which passes .min(0).
Number input fields emit `null` (not "") when cleared, so both must be normalized to undefined here.
If we want to use this schema inside a form we have to use the Transformers.number.toNumberOrNull to transform the value to a number or null since this returns `unknown` for the value.
*/
export const RequiredNumberValidationSchema = (options?: {
  min?: number;
  max?: number;
}) => {
  const min = options?.min ?? 0;
  const numberSchema =
    options?.max !== undefined
      ? z.coerce.number().min(min).max(options.max)
      : z.coerce.number().min(min);

  return z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    numberSchema,
  );
};
