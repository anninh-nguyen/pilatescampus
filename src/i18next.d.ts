// Fix react-i18next children type compatibility with React 18
// See: https://github.com/i18next/react-i18next/issues/1543
import "i18next";

declare module "i18next" {
  interface CustomTypeOptions {
    allowObjectInHTMLChildren: true;
  }
}
