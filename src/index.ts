import {
  API
  // HAP,
  // PlatformAccessory
} from 'homebridge'
import { PLATFORM_NAME, PLUGIN_NAME } from './config'
import MELCloudPlatform from './platform'

// const PLUGIN_NAME = 'homebridge-melcloud-ts'
// const PLATFORM_NAME = 'MELCloud'

// TODO: Test whether this supports multiple platforms or not, then configure "config.schema.json" accordingly

// TODO: Get the plugin verified:
//       https://github.com/homebridge/verified#requirements

// FIXME: Somehow migrate this from an ancient hap-nodejs version to a Homebridge plugin
// https://developers.homebridge.io/#/
// https://github.com/homebridge/homebridge-examples/blob/master/independent-platform-example-typescript/src/independent-platform.ts
// https://github.com/homebridge/HAP-NodeJS-examples/blob/master/light-example-typescript/src/light.ts
// https://github.com/Sunoo/homebridge-camera-ffmpeg/blob/master/src/index.ts

// let hap: HAP
// let Accessory: typeof PlatformAccessory

// Export to Homebridge
export = (api: API): void => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // hap = api.hap

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // Accessory = api.platformAccessory

  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, MELCloudPlatform)
}
