import { HStack } from "@styled-system/jsx";
import { ReactNode } from "react";

type ActionRowProps = {
  children: ReactNode;
};

export function ActionRow({ children }: ActionRowProps) {
  return (
    <HStack
      gap={4}
      width={"full"}
      alignItems={{ base: "stretch", lg: "flex-end" }}
      flexDirection={{ base: "column", lg: "row" }}
    >
      {children}
    </HStack>
  );
}
