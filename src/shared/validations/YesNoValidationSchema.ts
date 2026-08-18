import { YesNoOptions } from "@/shared/components/form/YesNoRadioGroup/options";
import * as z from "@/lib/zod";

export const YesNoValidationSchema = z.enum(YesNoOptions).transform((value) => {
  return value === YesNoOptions.YES;
});
