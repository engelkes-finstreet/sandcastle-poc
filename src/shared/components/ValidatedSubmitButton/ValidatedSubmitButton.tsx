"use client";

import { Button } from "@finstreet/ui/components/base/Button";
import { useFormContext } from "@finstreet/forms/rhf";

type ValidatedSubmitButtonProps = {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onValidationSuccess: () => void;
  "data-testid"?: string;
};

/**
 * A button that validates the surrounding form before handing over to
 * `onValidationSuccess` — e.g. to open a confirmation modal. It is deliberately
 * not a submit button: the actual submission happens elsewhere.
 */
export const ValidatedSubmitButton = ({
  label,
  loading,
  disabled,
  onValidationSuccess,
  "data-testid": dataTestId,
}: ValidatedSubmitButtonProps) => {
  const { trigger } = useFormContext();

  const handleClick = async () => {
    const isValid = await trigger();

    if (isValid) {
      onValidationSuccess();
    }
  };

  return (
    <Button
      type={"button"}
      loading={loading}
      disabled={disabled}
      onClick={handleClick}
      data-testid={dataTestId}
    >
      {label}
    </Button>
  );
};
