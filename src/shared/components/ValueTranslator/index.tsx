import { Formatter } from "@finstreet/ui/components/base/Formatter";
import { useExtracted } from "next-intl";

export type ValueTranslatorType =
  | "boolean"
  | "numberWithUnit"
  | "string"
  | "number";

type ValueTranslatorProps = {
  type: ValueTranslatorType;
  value: any;
};

export const ValueTranslator = ({ type, value }: ValueTranslatorProps) => {
  switch (type) {
    case "string":
      return <StringValueTranslator value={value} />;
    case "boolean":
      return <BooleanValueTranslator value={value} />;
    case "numberWithUnit":
      return <NumberWithUnitValueTranslator value={value} />;
    case "number":
      return <NumberValueTranslator value={value} />;
    default:
      return null;
  }
};

type StringValueTranslatorProps = {
  value: string | null;
};

const StringValueTranslator = ({ value }: StringValueTranslatorProps) => {
  const t = useExtracted();

  if (value) {
    return value;
  }

  return t("-");
};

type NumberValueTranslatorProps = {
  value: number;
};

const NumberValueTranslator = ({ value }: NumberValueTranslatorProps) => {
  return <Formatter amount={value} locale={"de-DE"} maxDecimals={2} />;
};

type BooleanValueTranslatorProps = {
  value: boolean;
};

const BooleanValueTranslator = ({ value }: BooleanValueTranslatorProps) => {
  const t = useExtracted();

  return value ? t("Ja") : t("Nein");
};

type NumberWithUnitValueTranslatorProps = {
  value: {
    amount: number | string;
    displayUnit: string;
  } | null;
};

const NumberWithUnitValueTranslator = ({
  value,
}: NumberWithUnitValueTranslatorProps) => {
  const t = useExtracted();

  if (!value) {
    return t("-");
  }

  return (
    <Formatter
      amount={value.amount}
      unit={value.displayUnit}
      maxDecimals={2}
      locale={"de-DE"}
    />
  );
};
