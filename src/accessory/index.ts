import {
  API,
  APIEvent,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  DynamicPlatformPlugin,
  HAP,
  IndependentPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformAccessoryEvent,
  PlatformConfig,
  Characteristic,
  Service,
  AccessoryConfig,
  Categories,
  UnknownContext
} from 'homebridge'
// import {
//   CurrentHeatingCoolingState,
//   TargetHeatingCoolingState,
//   TemperatureDisplayUnits,
//   RotationSpeed,
//   CurrentHorizontalTiltAngle,
//   TargetHorizontalTiltAngle,
//   CurrentVerticalTiltAngle,
//   TargetVerticalTiltAngle
// } from 'hap-nodejs/dist/lib/definitions/CharacteristicDefinitions'
// import { IMELCloudAccessoryConfig, validateMELCloudAccessoryConfig } from '../config'
import { IMELCloudPlatform } from '../platform'
import { IDevice, IDeviceGet } from '../api/client'

export interface IMELCloudBridgedAccessory extends Partial<PlatformAccessory> {
  readonly service: Service
  readonly platform: IMELCloudPlatform
  readonly accessory: PlatformAccessory

  readonly log: Logger
  readonly api: API

  currentHeatingCoolingState: number
  targetHeatingCoolingState: number
  currentTemperature: number
  targetTemperature: number
  temperatureDisplayUnits: number
  // currentRelativeHumidity: number
  // targetRelativeHumidity: number
  // coolingThresholdTemperature: number
  // heatingThresholdTemperature: number
  // rotationSpeed: number
  // swingMode: number
  // currentHorizontalTiltAngle: number
  // targetHorizontalTiltAngle: number
  // currentVerticalTiltAngle: number
  // targetVerticalTiltAngle: number

  handleCurrentHeatingCoolingStateGet(): Promise<number>
  handleTargetHeatingCoolingStateGet(): Promise<number>
  handleTargetHeatingCoolingStateSet(value: CharacteristicValue): Promise<void>

  handleCurrentTemperatureGet(): Promise<number>
  handleTargetTemperatureGet(): Promise<number>
  handleTargetTemperatureSet(value: CharacteristicValue): Promise<void>

  handleTemperatureDisplayUnitsGet(): Promise<number>
  handleTemperatureDisplayUnitsSet(value: CharacteristicValue): Promise<void>

  // handleCurrentRelativeHumidityGet(): number
  // handleTargetRelativeHumidityGet(): number
  // handleTargetRelativeHumiditySet(value: CharacteristicValue): void

  // handleCoolingThresholdTemperatureGet(): number
  // handleCoolingThresholdTemperatureSet(value: CharacteristicValue): void

  // handleHeatingThresholdTemperatureGet(): number
  // handleHeatingThresholdTemperatureSet(value: CharacteristicValue): void

  // handleRotationSpeedGet(): number
  // handleRotationSpeedSet(value: CharacteristicValue): void

  // handleCurrentHorizontalTiltAngleGet(): number
  // handleCurrentHorizontalTiltAngleSet(value: CharacteristicValue): void

  // handleTargetHorizontalTiltAngleGet(): number
  // handleTargetHorizontalTiltAngleSet(value: CharacteristicValue): void

  // handleCurrentVerticalTiltAngleGet(): number
  // handleCurrentVerticalTiltAngleSet(value: CharacteristicValue): void

  // handleTargetVerticalTiltAngleGet(): number
  // handleTargetVerticalTiltAngleSet(value: CharacteristicValue): void

  updateDeviceInfo(): Promise<void>
  getDeviceInfo(): Promise<IDeviceGet>
  sendDeviceData(characteristicUUID: string, value: CharacteristicValue): Promise<void>

  // readonly log: Logging
  // readonly config: IMELCloudAccessoryConfig
  // readonly api: API

  // readonly name: string;

  // readonly thermostatService: Service
  // readonly informationService: Service

  // platform: IMELCloudPlatform
  // remoteAccessory: any
  // id: any
  // model: any
  // manufacturer: any
  // serialNumber: any
  // airInfo: any
  // airInfoRequestSent: boolean
  // buildingId: any
  // services: Array<Service>

  // getServices (): Array<Service>
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

  public currentHeatingCoolingState: number
  public targetHeatingCoolingState: number
  public currentTemperature: number
  public targetTemperature: number
  public temperatureDisplayUnits: number

  // TODO: These aren't included in the API response, so humidity is probably not supported?
  // public currentRelativeHumidity: number
  // public targetRelativeHumidity: number
  // public coolingThresholdTemperature: number
  // public heatingThresholdTemperature: number

  // public rotationSpeed: number
  // public currentHorizontalTiltAngle: number
  // public targetHorizontalTiltAngle: number
  // public currentVerticalTiltAngle: number
  // public targetVerticalTiltAngle: number

  // public readonly log: Logging
  // public readonly config: IMELCloudAccessoryConfig
  // public readonly api: API

  // public readonly name: string

  // public readonly thermostatService: Service
  // public readonly informationService: Service

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

    // FIXME: Load these from storage? Or wait for client update to set them instead?
    // initialize accessory state
    this.currentHeatingCoolingState = this.api.hap.Characteristic.CurrentHeatingCoolingState.OFF
    this.targetHeatingCoolingState = this.api.hap.Characteristic.TargetHeatingCoolingState.OFF
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

    // get the Thermostat service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    // FIXME: Consider trying the HeaterCooler approach as well (maybe as a separate accessory?):
    //        https://developers.homebridge.io/#/service/HeaterCooler
    this.service = this.accessory.getService(this.platform.Service.Thermostat) || this.accessory.addService(this.platform.Service.Thermostat)
    // this.service = this.accessory.getService(this.platform.Service.HeaterCooler) || this.accessory.addService(this.platform.Service.HeaterCooler)

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    // FIXME: Use the accessory.context to pass arbitrary data, such as model, serial and name
    // this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.exampleDisplayName)
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName)

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Thermostat

    // Register handlers for current heating/cooling state
    this.service.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
      .onGet(this.handleCurrentHeatingCoolingStateGet.bind(this))

    // Register handlers for target heating/cooling state
    this.service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .onGet(this.handleTargetHeatingCoolingStateGet.bind(this))
      .onSet(this.handleTargetHeatingCoolingStateSet.bind(this))

    // Register handlers for current temperature
    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.handleCurrentTemperatureGet.bind(this))

    // Register handlers for target temperature
    this.service.getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .onGet(this.handleTargetTemperatureGet.bind(this))
      .onSet(this.handleTargetTemperatureSet.bind(this))

    // Register handlers for temperature display units
    this.service.getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
      .onGet(this.handleTemperatureDisplayUnitsGet.bind(this))
      .onSet(this.handleTemperatureDisplayUnitsSet.bind(this))

    // Register handlers for cooling threshold temperature
    // this.service.getCharacteristic(this.platform.Characteristic.CoolingThresholdTemperature)
    //   .onGet(this.handleCoolingThresholdTemperatureGet.bind(this))
    //   .onSet(this.handleCoolingThresholdTemperatureSet.bind(this))

    // Register handlers for heating threshold temperature
    // this.service.getCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature)
    //   .onGet(this.handleHeatingThresholdTemperatureGet.bind(this))
    //   .onSet(this.handleHeatingThresholdTemperatureSet.bind(this))

    // Register handlers for rotatin speed
    // this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
    //   .onGet(this.handleRotationSpeedGet.bind(this))
    //   .onSet(this.handleRotationSpeedSet.bind(this))

    // Register handlers for current horizontal tilt angle
    // this.service.getCharacteristic(this.platform.Characteristic.CurrentHorizontalTiltAngle)
    //   .onGet(this.handleCurrentHorizontalTiltAngleGet.bind(this))
    //   .onSet(this.handleCurrentHorizontalTiltAngleSet.bind(this))

    // Register handlers for target horizontal tilt angle
    // this.service.getCharacteristic(this.platform.Characteristic.TargetHorizontalTiltAngle)
    //   .onGet(this.handleTargetHorizontalTiltAngleGet.bind(this))
    //   .onSet(this.handleTargetHorizontalTiltAngleSet.bind(this))

    // Register handlers for current vertical tilt angle
    // this.service.getCharacteristic(this.platform.Characteristic.CurrentVerticalTiltAngle)
    //   .onGet(this.handleCurrentVerticalTiltAngleGet.bind(this))
    //   .onSet(this.handleCurrentVerticalTiltAngleSet.bind(this))

    // Register handlers for target vertical tilt angle
    // this.service.getCharacteristic(this.platform.Characteristic.TargetVerticalTiltAngle)
    //   .onGet(this.handleTargetVerticalTiltAngleGet.bind(this))
    //   .onSet(this.handleTargetVerticalTiltAngleSet.bind(this))
  }

  /**
   * Handle requests to get the current value of the "Current Heating Cooling State" characteristic
   */
  async handleCurrentHeatingCoolingStateGet(): Promise<number> {
    this.log.debug('Triggered GET CurrentHeatingCoolingState')

    // FIXME: This shouldn't be done with every GET request! Or wait, should it?
    // Update device info
    await this.updateDeviceInfo()

    const currentValue = this.currentHeatingCoolingState

    this.log.debug('Returning CurrentHeatingCoolingState with value:', currentValue)
    return currentValue
  }

  /**
   * Handle requests to get the current value of the "Target Heating Cooling State" characteristic
   */
  async handleTargetHeatingCoolingStateGet(): Promise<number> {
    this.log.debug('Triggered GET TargetHeatingCoolingState')

    // FIXME: This shouldn't be done with every GET request! Or wait, should it?
    // Update device info
    await this.updateDeviceInfo()

    const currentValue = this.targetHeatingCoolingState

    this.log.debug('Returning TargetHeatingCoolingState with value:', currentValue)
    return currentValue
  }

  /**
   * Handle requests to set the "Target Heating Cooling State" characteristic
   */
  async handleTargetHeatingCoolingStateSet(value: CharacteristicValue): Promise<void> {
    this.log.debug('Triggered SET TargetHeatingCoolingState:', value)

    this.targetHeatingCoolingState = value as number

    await this.sendDeviceData(this.api.hap.Characteristic.TargetHeatingCoolingState.UUID, this.targetHeatingCoolingState)
  }

  /**
   * Handle requests to get the current value of the "Current Temperature" characteristic
   */
  async handleCurrentTemperatureGet(): Promise<number> {
    this.log.debug('Triggered GET CurrentTemperature')

    // FIXME: This shouldn't be done with every GET request! Or wait, should it?
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

    // FIXME: This shouldn't be done with every GET request! Or wait, should it?
    // Update device info
    await this.updateDeviceInfo()

    const minTargetTemperature = 10
    const maxTargetTemperature = 38
    const currentValue = Math.min(maxTargetTemperature, Math.max(minTargetTemperature, this.targetTemperature))

    this.log.debug('Returning TargetTemperature with value:', currentValue)
    return currentValue
  }

  /**
   * Handle requests to set the "Target Temperature" characteristic
   */
  async handleTargetTemperatureSet(value: CharacteristicValue): Promise<void> {
    this.log.debug('Triggered SET TargetTemperature:', value)

    const minCurrentTemperature = 10
    const maxCurrentTemperature = 38
    const currentValue = Math.min(maxCurrentTemperature, Math.max(minCurrentTemperature, value as number))

    this.targetTemperature = currentValue

    await this.sendDeviceData(this.api.hap.Characteristic.TargetTemperature.UUID, this.targetTemperature)
  }

  /**
   * Handle requests to get the current value of the "Temperature Display Units" characteristic
   */
  async handleTemperatureDisplayUnitsGet(): Promise<number> {
    this.log.debug('Triggered GET TemperatureDisplayUnits')

    // FIXME: This shouldn't be done with every GET request! Or wait, should it?
    // Update device info
    await this.updateDeviceInfo()

    const currentValue = this.temperatureDisplayUnits

    this.log.debug('Returning TemperatureDisplayUnits with value:', currentValue)
    return currentValue
  }

  /**
   * Handle requests to set the "Temperature Display Units" characteristic
   */
  async handleTemperatureDisplayUnitsSet(value: CharacteristicValue): Promise<void> {
    this.log.debug('Triggered SET TemperatureDisplayUnits:', value)

    this.temperatureDisplayUnits = Math.min(1, Math.max(0, value as number))

    await this.sendDeviceData(this.api.hap.Characteristic.TemperatureDisplayUnits.UUID, this.temperatureDisplayUnits)
  }

  // /**
  //  * Handle requests to get the current value of the "Current Relative Humidity" characteristic
  //  */
  // handleCurrentRelativeHumidityGet(): number {
  //   this.log.debug('Triggered GET CurrentRelativeHumidity')

  //   const minCurrentRelativeHumidity = 0
  //   const maxCurrentRelativeHumidity = 100
  //   const currentValue = Math.min(maxCurrentRelativeHumidity, Math.max(minCurrentRelativeHumidity, this.currentRelativeHumidity))

  //   this.log.debug('Returning CurrentRelativeHumidity with value:', currentValue)
  //   return currentValue
  // }

  // /**
  //  * Handle requests to get the current value of the "Target Relative Humidity" characteristic
  //  */
  // handleTargetRelativeHumidityGet(): number {
  //   this.log.debug('Triggered GET TargetRelativeHumidity')

  //   const minTargetRelativeHumidity = 0
  //   const maxTargetRelativeHumidity = 100
  //   const currentValue = Math.min(maxTargetRelativeHumidity, Math.max(minTargetRelativeHumidity, this.targetRelativeHumidity))

  //   this.log.debug('Returning TargetRelativeHumidity with value:', currentValue)
  //   return currentValue
  // }

  // /**
  //  * Handle requests to set the "Target Relative Humidity" characteristic
  //  */
  // handleTargetRelativeHumiditySet(value: CharacteristicValue): void {
  //   this.log.debug('Triggered SET TargetRelativeHumidity:', value)

  //   const minTargetRelativeHumidity = 0
  //   const maxTargetRelativeHumidity = 100
  //   const currentValue = Math.min(maxTargetRelativeHumidity, Math.max(minTargetRelativeHumidity, value as number))

  //   this.targetRelativeHumidity = currentValue
  // }

  // /**
  //  * Handle requests to get the current value of the "Cooling Threshold Temperature" characteristic
  //  */
  // handleCoolingThresholdTemperatureGet(): number {
  //   this.log.debug('Triggered GET CoolingThresholdTemperature')

  //   const minCoolingThresholdTemperature = 10
  //   const maxCoolingThresholdTemperature = 35
  //   const currentValue = Math.min(maxCoolingThresholdTemperature, Math.max(minCoolingThresholdTemperature, this.coolingThresholdTemperature))

  //   this.log.debug('Returning CoolingThresholdTemperature with value:', currentValue)
  //   return currentValue
  // }

  // /**
  //  * Handle requests to set the "Cooling Threshold Temperature" characteristic
  //  */
  // handleCoolingThresholdTemperatureSet(value: CharacteristicValue): void {
  //   this.log.debug('Triggered SET CoolingThresholdTemperature:', value)

  //   const minCoolingThresholdTemperature = 10
  //   const maxCoolingThresholdTemperature = 35
  //   const currentValue = Math.min(maxCoolingThresholdTemperature, Math.max(minCoolingThresholdTemperature, value as number))

  //   this.coolingThresholdTemperature = currentValue
  // }

  // /**
  //  * Handle requests to get the current value of the "Heating Threshold Temperature" characteristic
  //  */
  // handleHeatingThresholdTemperatureGet(): number {
  //   this.log.debug('Triggered GET HeatingThresholdTemperature')

  //   const minHeatingThresholdTemperature = 0
  //   const maxHeatingThresholdTemperature = 25
  //   const currentValue = Math.min(maxHeatingThresholdTemperature, Math.max(minHeatingThresholdTemperature, this.heatingThresholdTemperature))

  //   this.log.debug('Returning HeatingThresholdTemperature with value:', currentValue)
  //   return currentValue
  // }

  // /**
  //  * Handle requests to set the "Heating Threshold Temperature" characteristic
  //  */
  // handleHeatingThresholdTemperatureSet(value: CharacteristicValue): void {
  //   this.log.debug('Triggered SET HeatingThresholdTemperature:', value)

  //   const minHeatingThresholdTemperature = 0
  //   const maxHeatingThresholdTemperature = 25
  //   const currentValue = Math.min(maxHeatingThresholdTemperature, Math.max(minHeatingThresholdTemperature, value as number))

  //   this.heatingThresholdTemperature = currentValue
  // }

  // /**
  //  * Handle requests to get the current value of the "Rotation Speed" characteristic
  //  */
  // handleRotationSpeedGet(): number {
  //   this.log.debug('Triggered GET RotationSpeed')

  //   const currentValue = this.rotationSpeed

  //   this.log.debug('Returning RotationSpeed with value:', currentValue)
  //   return currentValue
  // }

  // /**
  //  * Handle requests to set the "Rotation Speed" characteristic
  //  */
  // handleRotationSpeedSet(value: CharacteristicValue): void {
  //   this.log.debug('Triggered SET RotationSpeed:', value)

  //   this.rotationSpeed = value as number
  // }

  // /**
  //  * Handle requests to get the current value of the "Current Horizontal Tilt Angle" characteristic
  //  */
  // handleCurrentHorizontalTiltAngleGet(): number {
  //   this.log.debug('Triggered GET CurrentHorizontalTiltAngle')

  //   const currentValue = this.currentHorizontalTiltAngle

  //   this.log.debug('Returning CurrentHorizontalTiltAngle with value:', currentValue)
  //   return currentValue
  // }

  // /**
  //  * Handle requests to set the "Current Horizontal Tilt Angle" characteristic
  //  */
  // handleCurrentHorizontalTiltAngleSet(value: CharacteristicValue): void {
  //   this.log.debug('Triggered SET CurrentHorizontalTiltAngle:', value)

  //   this.currentHorizontalTiltAngle = value as number
  // }

  // /**
  //  * Handle requests to get the current value of the "Target Horizontal Tilt Angle" characteristic
  //  */
  // handleTargetHorizontalTiltAngleGet(): number {
  //   this.log.debug('Triggered GET TargetHorizontalTiltAngle')

  //   const currentValue = this.targetHorizontalTiltAngle

  //   this.log.debug('Returning TargetHorizontalTiltAngle with value:', currentValue)
  //   return currentValue
  // }

  // /**
  //  * Handle requests to set the "Target Horizontal Tilt Angle" characteristic
  //  */
  // handleTargetHorizontalTiltAngleSet(value: CharacteristicValue): void {
  //   this.log.debug('Triggered SET TargetHorizontalTiltAngle:', value)

  //   this.targetHorizontalTiltAngle = value as number
  // }

  // /**
  //  * Handle requests to get the current value of the "Current Vertical Tilt Angle" characteristic
  //  */
  // handleCurrentVerticalTiltAngleGet(): number {
  //   this.log.debug('Triggered GET CurrentVerticalTiltAngle')

  //   const currentValue = this.currentVerticalTiltAngle

  //   this.log.debug('Returning CurrentVerticalTiltAngle with value:', currentValue)
  //   return currentValue
  // }

  // /**
  //  * Handle requests to set the "Current Vertical Tilt Angle" characteristic
  //  */
  // handleCurrentVerticalTiltAngleSet(value: CharacteristicValue): void {
  //   this.log.debug('Triggered SET CurrentVerticalTiltAngle:', value)

  //   this.currentVerticalTiltAngle = value as number
  // }

  // /**
  //  * Handle requests to get the current value of the "Target Vertical Tilt Angle" characteristic
  //  */
  // handleTargetVerticalTiltAngleGet(): number {
  //   this.log.debug('Triggered GET TargetVerticalTiltAngle')

  //   const currentValue = this.targetVerticalTiltAngle

  //   this.log.debug('Returning TargetVerticalTiltAngle with value:', currentValue)
  //   return currentValue
  // }

  // /**
  //  * Handle requests to set the "Target Vertical Tilt Angle" characteristic
  //  */
  // handleTargetVerticalTiltAngleSet(value: CharacteristicValue): void {
  //   this.log.debug('Triggered SET TargetVerticalTiltAngle:', value)

  //   this.targetVerticalTiltAngle = value as number
  // }

  async updateDeviceInfo(): Promise<void> {
    const deviceInfo = await this.getDeviceInfo()

    const CurrentHeatingCoolingState = this.api.hap.Characteristic.CurrentHeatingCoolingState
    const TargetHeatingCoolingState = this.api.hap.Characteristic.TargetHeatingCoolingState
    const TemperatureDisplayUnits = this.api.hap.Characteristic.TemperatureDisplayUnits

    // Update current heating cooling state
    if (deviceInfo.Power != null) {
      if (deviceInfo.Power) {
        this.currentHeatingCoolingState = CurrentHeatingCoolingState.OFF
      } else {
        switch (deviceInfo.OperationMode) {
          case 1:
            this.currentHeatingCoolingState = CurrentHeatingCoolingState.HEAT
            break
          case 3:
            this.currentHeatingCoolingState = CurrentHeatingCoolingState.COOL
            break

          default:
            // MELCloud can return also 2 (dehumidify), 7 (Ventilation) and 8 (auto)
            // We return 5 which is undefined in HomeKit
            this.currentHeatingCoolingState = 5
            break
        }
      }
    }

    // Update target heating cooling state
    if (deviceInfo.Power != null) {
      if (deviceInfo.Power) {
        this.currentHeatingCoolingState = TargetHeatingCoolingState.OFF
      } else {
        switch (deviceInfo.OperationMode) {
          case 1:
            this.targetHeatingCoolingState = TargetHeatingCoolingState.HEAT
            break
          case 3:
            this.targetHeatingCoolingState = TargetHeatingCoolingState.COOL
            break
          case 8:
            this.targetHeatingCoolingState = TargetHeatingCoolingState.AUTO
            break

          default:
            // MELCloud can return also 2 (dehumidify), 7 (Ventilation) and 8 (auto)
            // We return 5 which is undefined in HomeKit
            this.targetHeatingCoolingState = 5
            break
        }
      }
    }

    // Update current temperature
    if (deviceInfo.RoomTemperature) {
      this.currentTemperature = deviceInfo.RoomTemperature
    }

    // Update target temperature
    if (deviceInfo.SetTemperature) {
      this.targetTemperature = deviceInfo.SetTemperature
    }

    // Update temperature display units
    if (this.platform.client.UseFahrenheit) {
      this.temperatureDisplayUnits = this.platform.client.UseFahrenheit ? TemperatureDisplayUnits.FAHRENHEIT : TemperatureDisplayUnits.CELSIUS
    }

    // TODO: Set rotation speed, tilt angle etc. (only necessary for HeaterCooler, not Thermostat, right?)
    //       Reference: https://github.com/ilcato/homebridge-melcloud/blob/89a7e46247caead0a208302c206c0146d32cddf7/index.js#L207

    // TODO: What about Current/Target Relative Humidity and Cooling/Heating Threshold Temperature

    // TODO: What about DefaultHeatingSetTemperature/DefaultCoolingSetTemperature in the API response?
  }

  async getDeviceInfo(): Promise<IDeviceGet> {
    const device: IDevice = this.accessory.context.device
    return this.platform.client.getDevice(device.DeviceID, device.BuildingID)
  }

  async sendDeviceData(characteristicUUID: string, value: CharacteristicValue): Promise<void> {
    // TODO: The payload may need more properties than what we're providing it!
    const data: IDeviceGet = {} as IDeviceGet

    // Prepare the data payload based on the input
    switch (characteristicUUID) {
      case this.api.hap.Characteristic.TargetHeatingCoolingState.UUID:
        switch (value) {
          case this.api.hap.Characteristic.TargetHeatingCoolingState.OFF:
            data.Power = false
            data.EffectiveFlags = 1
            break

          case this.api.hap.Characteristic.TargetHeatingCoolingState.HEAT:
            data.Power = true
            data.OperationMode = 1
            data.EffectiveFlags = 1 + 2
            break

          case this.api.hap.Characteristic.TargetHeatingCoolingState.COOL:
            data.Power = true
            data.OperationMode = 3
            data.EffectiveFlags = 1 + 2
            break

          case this.api.hap.Characteristic.TargetHeatingCoolingState.AUTO:
            data.Power = true
            data.OperationMode = 8
            data.EffectiveFlags = 1 + 2
            break

          default:
            break
        }
        break

      case this.api.hap.Characteristic.TargetTemperature.UUID:
        data.SetTemperature = value as number
        data.EffectiveFlags = 4
        break

        // FIXME: Not sure what the original intention here was? To forcibly update the value from local to API?
        // case this.api.hap.Characteristic.TemperatureDisplayUnits.UUID:
        //   this.api.platformAccessory.updateApplicationOptions(value == this.api.hap.Characteristic.TemperatureDisplayUnits.FAHRENHEIT)
        //   break

        // TODO: Add rotation speed and tilt angles etc. too?

      default:
        break
    }

    // Send the data payload to the MELCloud API
    await this.platform.client.setDeviceData(data)
  }

  // constructor(log: Logging, config: AccessoryConfig | IMELCloudAccessoryConfig, api: API) {
  //   // Store a reference to the logger
  //   if (!log) {
  //     throw new Error('Invalid or null Homebridge logger')
  //   }
  //   this.log = log

  //   // TODO: Figure out if we can stringify config or not
  //   this.log.info('Initializing new MELCloudBridgedAccessory with config:', config)
  //   this.log.info('Initializing new MELCloudBridgedAccessory with config:', JSON.stringify(config))

  //   // Store a reference to the config
  //   if (!config) {
  //     throw new Error('Invalid or null Homebridge accessory config')
  //   }
  //   validateMELCloudAccessoryConfig(config as IMELCloudAccessoryConfig)
  //   this.config = config as IMELCloudAccessoryConfig

  //   // Store a reference to the HAP API
  //   if (!api) {
  //     throw new Error('Invalid or null Homebridge API')
  //   }
  //   this.api = api

  //   // this.name = config.name

  //   // Setup the thermostat service that's in charge of controlling the device
  //   this.thermostatService = new api.hap.Service.Thermostat(config.name)
  //   // TODO: Setup thermostatService characteristics

  //   // Setup the information service which will provide more details on the device
  //   this.informationService = new hap.Service.AccessoryInformation()
  //     .setCharacteristic(hap.Characteristic.Manufacturer, config.manufacturer)
  //     .setCharacteristic(hap.Characteristic.Model, config.model)
  //     .setCharacteristic(hap.Characteristic.Name, config.name)
  //     .setCharacteristic(hap.Characteristic.SerialNumber, config.serial)

  //   this.log.info('MELCloudBridgedAccessory finished initializing!')
  // }

  // getServices(): Array<Service> {
  //   return [
  //     this.informationService,
  //     this.thermostatService
  //   ]
  // }
}
