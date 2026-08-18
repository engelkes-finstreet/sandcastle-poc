import { useExtracted } from "next-intl";

export enum YesNoOptions {
  YES = "yes",
  NO = "no",
}

export function useYesNoOptions() {
  const t = useExtracted();

  return [
    { label: t("Ja"), value: YesNoOptions.YES },
    { label: t("Nein"), value: YesNoOptions.NO },
  ];
}

export function transformBooleanToYesNoOption(value?: boolean | null) {
  if (value === true) {
    return YesNoOptions.YES;
  } else if (value === false) {
    return YesNoOptions.NO;
  }

  return undefined;
}
