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
import { IDevice } from '../api/client'
// import { Accessory } from 'hap-nodejs'

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
  rotationSpeed: number
  currentHorizontalTiltAngle: number
  targetHorizontalTiltAngle: number
  currentVerticalTiltAngle: number
  targetVerticalTiltAngle: number

  handleCurrentHeatingCoolingStateGet(): number
  handleTargetHeatingCoolingStateGet(): number
  handleTargetHeatingCoolingStateSet(value: CharacteristicValue): void

  handleCurrentTemperatureGet(): number
  handleTargetTemperatureGet(): number
  handleTargetTemperatureSet(value: CharacteristicValue): void

  handleTemperatureDisplayUnitsGet(): number
  handleTemperatureDisplayUnitsSet(value: CharacteristicValue): void

  handleRotationSpeedGet(): number
  handleRotationSpeedSet(value: CharacteristicValue): void

  handleCurrentHorizontalTiltAngleGet(): number
  handleCurrentHorizontalTiltAngleSet(value: CharacteristicValue): void

  handleTargetHorizontalTiltAngleGet(): number
  handleTargetHorizontalTiltAngleSet(value: CharacteristicValue): void

  handleCurrentVerticalTiltAngleGet(): number
  handleCurrentVerticalTiltAngleSet(value: CharacteristicValue): void

  handleTargetVerticalTiltAngleGet(): number
  handleTargetVerticalTiltAngleSet(value: CharacteristicValue): void

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
  public rotationSpeed: number
  public currentHorizontalTiltAngle: number
  public targetHorizontalTiltAngle: number
  public currentVerticalTiltAngle: number
  public targetVerticalTiltAngle: number

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

    // initialize accessory state
    this.currentHeatingCoolingState = this.api.hap.Characteristic.CurrentHeatingCoolingState.OFF
    this.targetHeatingCoolingState = this.api.hap.Characteristic.TargetHeatingCoolingState.OFF
    this.currentTemperature = 0
    this.targetTemperature = 0
    this.temperatureDisplayUnits = this.api.hap.Characteristic.TemperatureDisplayUnits.CELSIUS
    this.rotationSpeed = 0
    this.currentHorizontalTiltAngle = 0
    this.targetHorizontalTiltAngle = 0
    this.currentVerticalTiltAngle = 0
    this.targetVerticalTiltAngle = 0

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
    this.service = this.accessory.getService(this.platform.Service.Thermostat) || this.accessory.addService(this.platform.Service.Thermostat)

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

    // Register handlers for rotatin speed
    this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .onGet(this.handleRotationSpeedGet.bind(this))
      .onSet(this.handleRotationSpeedSet.bind(this))

    // Register handlers for current horizontal tilt angle
    this.service.getCharacteristic(this.platform.Characteristic.CurrentHorizontalTiltAngle)
      .onGet(this.handleCurrentHorizontalTiltAngleGet.bind(this))
      .onSet(this.handleCurrentHorizontalTiltAngleSet.bind(this))

    // Register handlers for target horizontal tilt angle
    this.service.getCharacteristic(this.platform.Characteristic.TargetHorizontalTiltAngle)
      .onGet(this.handleTargetHorizontalTiltAngleGet.bind(this))
      .onSet(this.handleTargetHorizontalTiltAngleSet.bind(this))

    // Register handlers for current vertical tilt angle
    this.service.getCharacteristic(this.platform.Characteristic.CurrentVerticalTiltAngle)
      .onGet(this.handleCurrentVerticalTiltAngleGet.bind(this))
      .onSet(this.handleCurrentVerticalTiltAngleSet.bind(this))

    // Register handlers for target vertical tilt angle
    this.service.getCharacteristic(this.platform.Characteristic.TargetVerticalTiltAngle)
      .onGet(this.handleTargetVerticalTiltAngleGet.bind(this))
      .onSet(this.handleTargetVerticalTiltAngleSet.bind(this))
  }

  /**
   * Handle requests to get the current value of the "Current Heating Cooling State" characteristic
   */
  handleCurrentHeatingCoolingStateGet(): number {
    this.log.debug('Triggered GET CurrentHeatingCoolingState')

    const currentValue = this.currentHeatingCoolingState

    this.log.debug('Returning CurrentHeatingCoolingState with value:', currentValue)
    return currentValue
  }

  /**
   * Handle requests to get the current value of the "Target Heating Cooling State" characteristic
   */
  handleTargetHeatingCoolingStateGet(): number {
    this.log.debug('Triggered GET TargetHeatingCoolingState')

    const currentValue = this.targetHeatingCoolingState

    this.log.debug('Returning TargetHeatingCoolingState with value:', currentValue)
    return currentValue
  }

  /**
   * Handle requests to set the "Target Heating Cooling State" characteristic
   */
  handleTargetHeatingCoolingStateSet(value: CharacteristicValue): void {
    this.log.debug('Triggered SET TargetHeatingCoolingState:', value)

    this.targetHeatingCoolingState = value as number
  }

  /**
   * Handle requests to get the current value of the "Current Temperature" characteristic
   */
  handleCurrentTemperatureGet(): number {
    this.log.debug('Triggered GET CurrentTemperature')

    const currentValue = this.currentTemperature

    this.log.debug('Returning CurrentTemperature with value:', currentValue)
    return currentValue
  }


  /**
   * Handle requests to get the current value of the "Target Temperature" characteristic
   */
  handleTargetTemperatureGet(): number {
    this.log.debug('Triggered GET TargetTemperature')

    const currentValue = this.targetTemperature

    this.log.debug('Returning TargetTemperature with value:', currentValue)
    return currentValue
  }

  /**
   * Handle requests to set the "Target Temperature" characteristic
   */
  handleTargetTemperatureSet(value: CharacteristicValue): void {
    this.log.debug('Triggered SET TargetTemperature:', value)

    this.targetTemperature = value as number
  }

  /**
   * Handle requests to get the current value of the "Temperature Display Units" characteristic
   */
  handleTemperatureDisplayUnitsGet(): number {
    this.log.debug('Triggered GET TemperatureDisplayUnits')

    const currentValue = this.temperatureDisplayUnits

    this.log.debug('Returning TemperatureDisplayUnits with value:', currentValue)
    return currentValue
  }

  /**
   * Handle requests to set the "Temperature Display Units" characteristic
   */
  handleTemperatureDisplayUnitsSet(value: CharacteristicValue): void {
    this.log.debug('Triggered SET TemperatureDisplayUnits:', value)

    this.temperatureDisplayUnits = value as number
  }

  /**
   * Handle requests to get the current value of the "Rotation Speed" characteristic
   */
  handleRotationSpeedGet(): number {
    this.log.debug('Triggered GET RotationSpeed')

    const currentValue = this.rotationSpeed

    this.log.debug('Returning RotationSpeed with value:', currentValue)
    return currentValue
  }

  /**
   * Handle requests to set the "Rotation Speed" characteristic
   */
  handleRotationSpeedSet(value: CharacteristicValue): void {
    this.log.debug('Triggered SET RotationSpeed:', value)

    this.rotationSpeed = value as number
  }

  /**
   * Handle requests to get the current value of the "Current Horizontal Tilt Angle" characteristic
   */
  handleCurrentHorizontalTiltAngleGet(): number {
    this.log.debug('Triggered GET CurrentHorizontalTiltAngle')

    const currentValue = this.currentHorizontalTiltAngle

    this.log.debug('Returning CurrentHorizontalTiltAngle with value:', currentValue)
    return currentValue
  }

  /**
   * Handle requests to set the "Current Horizontal Tilt Angle" characteristic
   */
  handleCurrentHorizontalTiltAngleSet(value: CharacteristicValue): void {
    this.log.debug('Triggered SET CurrentHorizontalTiltAngle:', value)

    this.currentHorizontalTiltAngle = value as number
  }

  /**
   * Handle requests to get the current value of the "Target Horizontal Tilt Angle" characteristic
   */
  handleTargetHorizontalTiltAngleGet(): number {
    this.log.debug('Triggered GET TargetHorizontalTiltAngle')

    const currentValue = this.targetHorizontalTiltAngle

    this.log.debug('Returning TargetHorizontalTiltAngle with value:', currentValue)
    return currentValue
  }

  /**
   * Handle requests to set the "Target Horizontal Tilt Angle" characteristic
   */
  handleTargetHorizontalTiltAngleSet(value: CharacteristicValue): void {
    this.log.debug('Triggered SET TargetHorizontalTiltAngle:', value)

    this.targetHorizontalTiltAngle = value as number
  }

  /**
   * Handle requests to get the current value of the "Current Vertical Tilt Angle" characteristic
   */
  handleCurrentVerticalTiltAngleGet(): number {
    this.log.debug('Triggered GET CurrentVerticalTiltAngle')

    const currentValue = this.currentVerticalTiltAngle

    this.log.debug('Returning CurrentVerticalTiltAngle with value:', currentValue)
    return currentValue
  }

  /**
   * Handle requests to set the "Current Vertical Tilt Angle" characteristic
   */
  handleCurrentVerticalTiltAngleSet(value: CharacteristicValue): void {
    this.log.debug('Triggered SET CurrentVerticalTiltAngle:', value)

    this.currentVerticalTiltAngle = value as number
  }

  /**
   * Handle requests to get the current value of the "Target Vertical Tilt Angle" characteristic
   */
  handleTargetVerticalTiltAngleGet(): number {
    this.log.debug('Triggered GET TargetVerticalTiltAngle')

    const currentValue = this.targetVerticalTiltAngle

    this.log.debug('Returning TargetVerticalTiltAngle with value:', currentValue)
    return currentValue
  }

  /**
   * Handle requests to set the "Target Vertical Tilt Angle" characteristic
   */
  handleTargetVerticalTiltAngleSet(value: CharacteristicValue): void {
    this.log.debug('Triggered SET TargetVerticalTiltAngle:', value)

    this.targetVerticalTiltAngle = value as number
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
