import type { Metadata } from "next";
import "./globals.css";
import { ReactQueryProvider } from "@/shared/components/ReactQueryProvider";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ToastProvider } from "@finstreet/ui/components/patterns/Toasts";

// TODO(boilerplate): Update title and description to match your application.
export const metadata: Metadata = {
  title: "Finstreet Frontend Template",
  description:
    "A template to boost your productivity with Finstreet Frontend Libraries",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <ReactQueryProvider>
          <NuqsAdapter>
            <NextIntlClientProvider messages={messages}>
              <ToastProvider>{children}</ToastProvider>
            </NextIntlClientProvider>
          </NuqsAdapter>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
