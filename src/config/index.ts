export enum MELCloudLanguage {
  English = 0,
  Български,
  Čeština,
  Dansk,
  Deutsch,
  Eesti,
  Español,
  Français,
  Հայերեն,
  Latviešu,
  Lietuvių,
  Magyar,
  Nederlands,
  Norwegian,
  Polski,
  Português,
  Русский,
  Suomi,
  Svenska,
  Italiano,
  Українська,
  Türkçe,
  Ελληνικά,
  Hrvatski,
  Română,
  Slovenščina
}

export interface IMELCloudConfig {
  language: MELCloudLanguage
  username: string
  password: string
}

export function validateConfig (config: IMELCloudConfig) {
  if (!config.language) {
    config.language = MELCloudLanguage.English
  }
  if (!config.username) {
    throw new Error('MELCloud config is missing username')
  }
  if (!config.password) {
    throw new Error('MELCloud config is missing password')
  }
}

// export class MELCloudConfig implements IMELCloudConfig {
//   language: MELCloudLanguage
//   username: string
//   password: string
//   validate () {
//     if (!this.language) {
//       this.language = MELCloudLanguage.English
//     }
//     if (!this.username) {
//       throw new Error('MELCloud config is missing username')
//     }
//     if (!this.password) {
//       throw new Error('MELCloud config is missing password')
//     }
//   }
// }
