// Fix react-i18next ReactI18NextChildren type incompatibility with React 18
// This tells react-i18next to allow objects in HTML children, preventing
// the ReactI18NextChildren vs ReactNode type conflict.
// See: https://github.com/i18next/react-i18next/issues/1543

import "i18next";

declare module "i18next" {
  interface CustomTypeOptions {
    // This flag tells react-i18next to use ReactNode-compatible children types
    allowObjectInHTMLChildren: true;
  }
}
