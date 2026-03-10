// Fix react-i18next type compatibility with React 18
declare module "react-i18next" {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface ReactI18NextChildren extends React.ReactNode {}
}
