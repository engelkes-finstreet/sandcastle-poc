import * as realZod from "zod";

export * from "zod";

export const trimmedString = () => realZod.string().trim();
