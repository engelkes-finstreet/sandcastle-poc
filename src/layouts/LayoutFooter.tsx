import {
  Footer,
  FooterNav,
  FooterNavLink,
} from "@finstreet/ui/components/pageLayout/Footer";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { FaRegEnvelope, FaPhoneVolume } from "react-icons/fa6";
import { Box, HStack } from "@styled-system/jsx";
import { Constants } from "../shared/utils/constants";

export const LayoutFooter = () => {
  return (
    <Footer>
      <HStack mr={8}>
        <FaRegEnvelope />
        <Typography as={"p"}>anfrage@beispiel.de</Typography>
      </HStack>
      <HStack>
        <FaPhoneVolume />
        <Typography as={"p"}>+49 (0) 221 98817-105</Typography>
      </HStack>

      <Box flexGrow={1} />
      <FooterNav>
        <FooterNavLink
          name="Nutzungsbedingungen"
          url={Constants.termsAndConditionsUrl}
        />
        <FooterNavLink name="Impressum" url={Constants.imprintUrl} />
      </FooterNav>
    </Footer>
  );
};
