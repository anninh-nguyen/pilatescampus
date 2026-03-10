import "react-i18next";
import "react";

declare module "react-i18next" {
  interface ReactI18NextChildren {
    children?: React.ReactNode;
  }
}
