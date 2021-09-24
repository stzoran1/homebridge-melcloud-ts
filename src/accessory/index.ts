import {
  API,
  Logger,
  PlatformAccessory,
  Service
} from 'homebridge'

import { IMELCloudPlatform } from '../platform'
import { IDevice, IDeviceDetails } from '../api/client'

export interface IMELCloudBridgedAccessory extends Partial<PlatformAccessory> {
  readonly service: Service
  readonly platform: IMELCloudPlatform
  readonly accessory: PlatformAccessory

  readonly log: Logger
  readonly api: API

  active: number
  currentTemperature: number
  targetTemperature: number
  temperatureDisplayUnits: number

  handleActiveGet(): Promise<number>

  handleCurrentTemperatureGet(): Promise<number>

  handleTargetTemperatureGet(): Promise<number>

  handleTemperatureDisplayUnitsGet(): Promise<number>

  updateDeviceInfo(): Promise<void>
  getDeviceInfo(): Promise<IDeviceDetails>

}

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export default class MELCloudBridgedAccessory implements IMELCloudBridgedAccessory {
  public readonly service: Service
  public readonly platform: IMELCloudPlatform
  public readonly accessory: PlatformAccessory

  public readonly log: Logger
  public readonly api: API

  public active: number
  public currentTemperature: number
  public targetTemperature: number
  public temperatureDisplayUnits: number

  constructor(platform: IMELCloudPlatform, accessory: PlatformAccessory) {
    if (!platform) {
      throw new Error('Invalid or missing platform')
    }
    this.platform = platform

    if (!platform.log) {
      throw new Error('Invalid or missing platform logger')
    }
    this.log = platform.log

    if (!platform.api) {
      throw new Error('Invalid or missing platform API')
    }
    this.api = platform.api

    if (!accessory) {
      throw new Error('Invalid or missing accessory')
    }
    this.accessory = accessory

    // initialize accessory state
    this.active = this.api.hap.Characteristic.Active.INACTIVE
    this.currentTemperature = -270
    this.targetTemperature = 10
    this.temperatureDisplayUnits = this.api.hap.Characteristic.TemperatureDisplayUnits.CELSIUS

    this.updateDeviceInfo()
      .catch(err => {
        this.log.error('Failed to update device info, reverting to default values:', err)
      })


    // set accessory information
    const device = accessory.context.device as IDevice
    const informationService = this.accessory.getService(this.platform.Service.AccessoryInformation)
    if (informationService) {
      informationService
        .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Mitsubishi')
        .setCharacteristic(this.platform.Characteristic.Model, 'Unknown')
        .setCharacteristic(this.platform.Characteristic.Name, /*accessory.displayName ||*/ device.DeviceName || 'Not Set')
        .setCharacteristic(this.platform.Characteristic.SerialNumber, device.SerialNumber || 'Not Set')
    } else {
      throw new Error('Failed to set accessory information')
    }


    const service = this.platform.Service.TemperatureSensor
    this.service = this.accessory.getService(service) || this.accessory.addService(service)

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName)

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Thermostat

    // Setup service specific characteristic handlers
    // Register handlers for active
    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onGet(this.handleActiveGet.bind(this))


    // Register handlers for current temperature
    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.handleCurrentTemperatureGet.bind(this))

    // Register handlers for temperature display units
    this.service.getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
      .onGet(this.handleTemperatureDisplayUnitsGet.bind(this))
  }

  /**
   * Handle requests to get the current value of the "Active" characteristic
   */
  async handleActiveGet(): Promise<number> {
    this.log.debug('Triggered GET Active')

    // Update device info
    await this.updateDeviceInfo()

    const minActive = 0
    const maxActive = 1
    const currentValue = Math.min(maxActive, Math.max(minActive, this.active))

    this.log.debug('Returning Active with value:', currentValue)
    return currentValue
  }

  /**
   * Handle requests to get the current value of the "Current Temperature" characteristic
   */
  async handleCurrentTemperatureGet(): Promise<number> {
    this.log.debug('Triggered GET CurrentTemperature')

    // Update device info
    await this.updateDeviceInfo()

    const minCurrentTemperature = -270
    const maxCurrentTemperature = 100
    const currentValue = Math.min(maxCurrentTemperature, Math.max(minCurrentTemperature, this.currentTemperature))

    this.log.debug('Returning CurrentTemperature with value:', currentValue)
    return currentValue
  }

  /**
   * Handle requests to get the current value of the "Target Temperature" characteristic
   */
  async handleTargetTemperatureGet(): Promise<number> {
    this.log.debug('Triggered GET TargetTemperature')

    // Update device info
    await this.updateDeviceInfo()

    const minTargetTemperature = 10
    const maxTargetTemperature = 38
    const currentValue = Math.min(maxTargetTemperature, Math.max(minTargetTemperature, this.targetTemperature))

    this.log.debug('Returning TargetTemperature with value:', currentValue)
    return currentValue
  }

  /**
   * Handle requests to get the current value of the "Temperature Display Units" characteristic
   */
  async handleTemperatureDisplayUnitsGet(): Promise<number> {
    this.log.debug('Triggered GET TemperatureDisplayUnits')

    // Update device info
    await this.updateDeviceInfo()

    const minTemperatureDisplayUnits = 0
    const maxTemperatureDisplayUnits = 1
    const currentValue = Math.min(maxTemperatureDisplayUnits, Math.max(minTemperatureDisplayUnits, this.temperatureDisplayUnits))

    this.log.debug('Returning TemperatureDisplayUnits with value:', currentValue)
    return currentValue
  }


  async updateDeviceInfo(): Promise<void> {
    const deviceInfo = await this.getDeviceInfo()

    const Active = this.api.hap.Characteristic.Active

    const TemperatureDisplayUnits = this.api.hap.Characteristic.TemperatureDisplayUnits

    // Update active
    // TODO: Is Power same as Active?
    this.active = deviceInfo.Power != null && deviceInfo.Power ? Active.ACTIVE : Active.INACTIVE


    // Update target heater/heating cooler/cooling state
    //TODO: Handle status
    //if (deviceInfo.Power != null) {}

    // Update current temperature
    if (deviceInfo.RoomTemperature) {
      this.currentTemperature = deviceInfo.RoomTemperature
    } else if (deviceInfo.RoomTemperatureZone1) {
      this.currentTemperature = deviceInfo.RoomTemperatureZone1
    }

    // Update target temperature
    if (deviceInfo.SetTemperature) {
      this.targetTemperature = deviceInfo.SetTemperature
    } else if (deviceInfo.SetTemperatureZone1) {
      this.targetTemperature = deviceInfo.SetTemperatureZone1
    }

    // Update temperature display units
    if (this.platform.client.UseFahrenheit) {
      this.temperatureDisplayUnits = this.platform.client.UseFahrenheit ? TemperatureDisplayUnits.FAHRENHEIT : TemperatureDisplayUnits.CELSIUS
    }

  }

  async getDeviceInfo(): Promise<IDeviceDetails> {
    const device: IDevice = this.accessory.context.device
    const deviceDetails: IDeviceDetails = await this.platform.client.getDevice(device.DeviceID, device.BuildingID)
    this.accessory.context.deviceDetails = deviceDetails
    return deviceDetails
  }
}
