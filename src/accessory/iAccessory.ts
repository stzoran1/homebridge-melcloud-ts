import {
  API,
  Logger,
  PlatformAccessory,
  Service
} from 'homebridge'

import { IMELCloudPlatform } from '../platform'
import { IDeviceDetails } from '../api/client'

export interface IMELCloudBridgedAccessory extends Partial<PlatformAccessory> {
  readonly service: Service
  readonly platform: IMELCloudPlatform
  readonly accessory: PlatformAccessory

  readonly log: Logger
  readonly api: API

  active: number
  currentTemperature: number
  temperatureDisplayUnits: number

  handleActiveGet(): Promise<number>

  handleCurrentTemperatureGet(): Promise<number>

  handleTemperatureDisplayUnitsGet(): Promise<number>

  updateDeviceInfo(): Promise<void>
  getDeviceInfo(): Promise<IDeviceDetails>

}
