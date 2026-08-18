"use client";

import { useEffect } from "react";

export const ResetScrollPosition = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return null;
};
