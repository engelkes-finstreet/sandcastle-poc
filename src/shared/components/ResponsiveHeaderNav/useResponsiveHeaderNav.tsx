import useElementWidth from "@/shared/hooks/useElementWidth";
import { useState, useRef, useEffect } from "react";

type UseResponsiveHeaderNavProps = {
  offset?: number;
};

export const useResponsiveHeaderNav = ({
  offset = 40,
}: UseResponsiveHeaderNavProps) => {
  const [width, setWidth] = useState({ logo: 0, nav: 0 });
  const logoRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const { ref: containerRef, width: availableWidth } =
    useElementWidth<HTMLDivElement>();

  useEffect(() => {
    return setWidth({
      logo: logoRef.current?.offsetWidth ?? 0,
      nav: navRef.current?.offsetWidth ?? 0,
    });
  }, [logoRef, navRef]);

  // we calculate the width that is needed for the logo and the navigation, including an offset as error margin.
  // when both logo and navigation width can be determined, we can check if the available space is enough to not overflow.
  const neededWidth =
    width.logo && width.nav ? width.logo + width.nav + offset : 0;
  const isOverflown = availableWidth < neededWidth;

  return { logoRef, navRef, containerRef, isOverflown };
};
