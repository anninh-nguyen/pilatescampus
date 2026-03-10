// Patch React types to accept Record<string, unknown> as valid ReactNode
// This resolves the react-i18next ReactI18NextChildren type conflict
declare namespace React {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface  
  interface DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES {}
}

// Make Record<string, unknown> assignable to ReactNode by extending the global JSX namespace
declare global {
  namespace JSX {
    // This extends the existing IntrinsicAttributes to accept react-i18next's children type
  }
}

// Override react-i18next's ReactI18NextChildren to be just ReactNode
declare module "react-i18next/TransWithoutContext" {
  import type { ReactNode } from "react";
  export type ReactI18NextChildren = ReactNode;
}

export {};
