"use client";

import { useYesNoOptions } from "@/shared/components/form/YesNoRadioGroup/options";
import { BaseField } from "@finstreet/forms";
import { FormRadioGroup } from "@finstreet/forms/components";
import { YesNoRadioGroupFieldConfig } from "@finstreet/forms/DynamicFormField";

type Props = {
  name: string;
  fieldConfig: YesNoRadioGroupFieldConfig<any, any>;
};

export const YesNoRadioGroup = ({ name, fieldConfig }: Props) => {
  const items = useYesNoOptions();

  return (
    <FormRadioGroup
      fieldConfig={{
        ...fieldConfig,
        items,
        type: "radio-group",
      }}
      name={name}
      data-testid={`${name}-${BaseField.YES_NO_RADIO_GROUP}`}
    />
  );
};
