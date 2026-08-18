import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  const locale = "de";

  const appMessages = await import(`../../messages/${locale}.po`);

  const messages = {
    ...appMessages.default,
  };

  return {
    locale,
    messages,
  };
}) as any; // leads to a TS error - typing is not needed here
