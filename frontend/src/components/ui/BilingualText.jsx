import React from "react";
import { bi } from "@/lib/i18n";

// BilingualText — renders "Native / English" for a given i18n key + language.
// Large, high-contrast, bilingual per the accessibility directive.
export default function BilingualText({ k, lang, className = "", as: As = "div" }) {
  return <As className={className}>{bi(k, lang)}</As>;
}