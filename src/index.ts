require('@babel/polyfill')

let Service: any
let Characteristic: any

import { IMELCloudAPIClient, MELCloudAPIClient } from './api/client'
import { MELCloudConfig, validateConfig } from './config'

export default function (homebridge: any) {
  // Setup the core functionality
  Service = homebridge.hap.Service
  Characteristic = homebridge.hap.Characteristic

  // Register our MELCloudPlatform as a new HomeKit platform
  homebridge.registerPlatform(
    'homebridge-melcloud',
    'MELCloud',
    MELCloudPlatform
  )
}

export interface IMELCloudBridgedAccessory {
  platform: any
  remoteAccessory: any
  id: any
  name: any
  model: any
  manufacturer: any
  serialNumber: any
  airInfo: any
  buildingId: any
  services: any[]
  getServices (): any[]
}

export class MELCloudBridgedAccessory implements IMELCloudBridgedAccessory {
  platform: any
  remoteAccessory: any
  id: any
  name: any
  model: any
  manufacturer: any
  serialNumber: any
  airInfo: any
  buildingId: any
  services: any[]

  constructor (services: any[]) {
    this.services = services
  }

  getServices (): any[] {
    const services = []
    const informationService = this.platform.getInformationService(this)
    services.push(informationService)

    for (let service of this.services) {
      for (let serviceCharacteristic of service.characteristics) {
        let characteristic = service.controlService.getCharacteristic(serviceCharacteristic)
        if (!characteristic) {
          characteristic = service.controlService.addCharacteristic()
        }
        this.platform.bindCharacteristicEvents(characteristic, service, this)
      }
      services.push(service.controlService)
    }

    return services
  }
}

export interface IMELCloudPlatform {
  log: Function
  config: MELCloudConfig
  client: IMELCloudAPIClient
  UseFahrenheit: null
  CurrentHeatingCoolingStateUUID: any
  TargetHeatingCoolingStateUUID: any
  CurrentTemperatureUUID: any
  TargetTemperatureUUID: any
  TemperatureDisplayUnitsUUID: any
  RotationSpeedUUID: any
  CurrentHorizontalTiltAngleUUID: any
  TargetHorizontalTiltAngleUUID: any
  CurrentVerticalTiltAngleUUID: any
  TargetVerticalTiltAngleUUID: any
  currentAirInfoExecution: number
  airInfoExecutionPending: any[]
  accessories (callback: any): void
  getDevices (callback: any): Promise<any>
  createAccessories (building: any, devices: any, foundAccessories: any[]): void
  proxyAirInfo (callback: any, characteristic: any, service: any, homebridgeAccessory: any, value: any, operation: any): Promise<any>
  getAccessoryValue (callback: any, characteristic: any, service: any, homebridgeAccessory: any, value: any): void
  setAccessoryValue (callback: any, characteristic: any, service: any, homebridgeAccessory: any, value: any): Promise<any>
  updateApplicationOptions (UseFahrenheit: any): Promise<any>
  getInformationService (homebridgeAccessory: any): any
  bindCharacteristicEvents (characteristic: any, service: any, homebridgeAccessory: any): void
  getServices (homebridgeAccessory: any): any[]
}

export class MELCloudPlatform implements IMELCloudPlatform {
  // Homebridge logger
  log: Function

  // MELCloud specific Homebridge config
  config: MELCloudConfig

  // MELCloud API client
  client: IMELCloudAPIClient

  // MELCloud specific accessory/service information
  UseFahrenheit: null
  CurrentHeatingCoolingStateUUID: any
  TargetHeatingCoolingStateUUID: any
  CurrentTemperatureUUID: any
  TargetTemperatureUUID: any
  TemperatureDisplayUnitsUUID: any
  RotationSpeedUUID: any
  CurrentHorizontalTiltAngleUUID: any
  TargetHorizontalTiltAngleUUID: any
  CurrentVerticalTiltAngleUUID: any
  TargetVerticalTiltAngleUUID: any
  currentAirInfoExecution: number
  airInfoExecutionPending: any[]

  constructor (log: any, config: MELCloudConfig) {
    // Store a reference to the logger
    if (!log) {
      throw new Error('Invalid or null Homebridge logger')
    }
    this.log = log

    // Store a reference to the config
    if (!config) {
      throw new Error('Invalid or null Homebridge config')
    }
    validateConfig(config)
    this.config = config

    // Create a new MELCloud API client
    this.client = new MELCloudAPIClient(this.log, this.config)
    if (!this.client) {
      throw new Error('Failed to create MELCloud API client')
    }

    // Setup MELCloud specific accessory/service information
    this.UseFahrenheit = null
    this.CurrentHeatingCoolingStateUUID = (new Characteristic.CurrentHeatingCoolingState()).UUID
    this.TargetHeatingCoolingStateUUID = (new Characteristic.TargetHeatingCoolingState()).UUID
    this.CurrentTemperatureUUID = (new Characteristic.CurrentTemperature()).UUID
    this.TargetTemperatureUUID = (new Characteristic.TargetTemperature()).UUID
    this.TemperatureDisplayUnitsUUID = (new Characteristic.TemperatureDisplayUnits()).UUID
    this.RotationSpeedUUID = (new Characteristic.RotationSpeed()).UUID
    this.CurrentHorizontalTiltAngleUUID = (new Characteristic.CurrentHorizontalTiltAngle()).UUID
    this.TargetHorizontalTiltAngleUUID = (new Characteristic.TargetHorizontalTiltAngle()).UUID
    this.CurrentVerticalTiltAngleUUID = (new Characteristic.CurrentVerticalTiltAngle()).UUID
    this.TargetVerticalTiltAngleUUID = (new Characteristic.TargetVerticalTiltAngle()).UUID
    this.currentAirInfoExecution = 0
    this.airInfoExecutionPending = []
  }

  async accessories (callback: any) {
    this.log('Fetching MELCloud devices..')
    await this.client.login()
    .then((response) => {
      this.UseFahrenheit = response.UseFahrenheit
      this.log('UseFahrenheit:', this.UseFahrenheit)
      return this.getDevices(callback)
    })
    .catch((err) => {
      this.log('There was a problem logging in to MELCloud:', err)
      return callback([])
    })
  }

  async getDevices (callback: any): Promise<any> {
    await this.client.listDevices()
    .then((response: any) => {
      // Prepare an array of accessories
      const foundAccessories = [] as any[]

      // Parse and loop through all buildings
      for (let building of response) {
        this.log('Building:', building) // FIXME: Debug, remove after verifying

        // (Re)create the accessories
        this.createAccessories(building, building.Structure.Devices, foundAccessories)

        // Parse and loop through all floors
        for (let floor of building.Structure.Floors) {
          this.log('Floor:', floor) // FIXME: Debug, remove after verifying

          // (Re)create the accessories
          this.createAccessories(building, floor.Devices, foundAccessories)

          // Parse and loop through all floor areas
          for (let floorArea of floor.Areas) {
            this.log('Floor area:', floorArea) // FIXME: Debug, remove after verifying

            // (Re)create the accessories
            this.createAccessories(building, floorArea.Devices, foundAccessories)
          }

          // Parse and loop through all building areas
          for (let buildingArea of building.Structure.Areas) {
            this.log('Building area:', buildingArea) // FIXME: Debug, remove after verifying

            // (Re)create the accessories
            this.createAccessories(building, buildingArea.Devices, foundAccessories)
          }
        }

        // Return all found accessories
        return callback(foundAccessories)
      }
    })
    .catch((err: Error) => {
      this.log(err)
    })
  }

  createAccessories (building: any, devices: any, foundAccessories: any[]): void {
    // Loop through all MELCloud devices
    for (let device of devices) {
      // Create an accessory for each device
      const accessory = new MELCloudBridgedAccessory([{
        controlService: new Service.Thermostat(device.DeviceName),
        characteristics: [
          Characteristic.CurrentHeatingCoolingState,
          Characteristic.TargetHeatingCoolingState,
          Characteristic.CurrentTemperature,
          Characteristic.TargetTemperature,
          Characteristic.TemperatureDisplayUnits,
          Characteristic.RotationSpeed,
          Characteristic.CurrentHorizontalTiltAngle,
          Characteristic.TargetHorizontalTiltAngle,
          Characteristic.CurrentVerticalTiltAngle,
          Characteristic.TargetVerticalTiltAngle
        ]
      }])

      // Further setup the accessory
      accessory.platform = this
      accessory.remoteAccessory = device
      accessory.id = device.DeviceID
      accessory.name = device.DeviceName
      accessory.model = ''
      accessory.manufacturer = 'Mitsubishi'
      accessory.serialNumber = device.SerialNumber
      accessory.airInfo = null
      accessory.buildingId = building.ID
      this.log('Found device:', device.DeviceName)

      // Add the accessory to our array
      foundAccessories.push(accessory)
    }
  }

  async proxyAirInfo (callback: any, characteristic: any, service: any, homebridgeAccessory: any, value: any, operation: any): Promise<any> {
    if (homebridgeAccessory.airInfo !== null) {
      this.log('Data already available for:', homebridgeAccessory.name, '-', characteristic.displayName)
      operation(callback, characteristic, service, homebridgeAccessory, value)
      if (this.airInfoExecutionPending.length) {
        const args = this.airInfoExecutionPending.shift()
        this.log('Dequeuing remote request for', args[3].name, '-', args[1].displayName)
        this.proxyAirInfo.apply(this, args)
      }
      return
    }

    this.log('Getting data for:', homebridgeAccessory.name, '-', characteristic.displayName)
    if (this.currentAirInfoExecution < 1) {
      homebridgeAccessory.airInfoRequestSent = true
      this.currentAirInfoExecution++

      await this.client.getDevice(homebridgeAccessory.id, homebridgeAccessory.buildingId)
      .then((response: any) => {
        homebridgeAccessory.airInfo = response
        operation(callback, characteristic, service, homebridgeAccessory, value)

        // Cache airInfo data for 1 minute
        setTimeout(() => {
          homebridgeAccessory.airInfo = null
        }, 60 * 1000)
      })
      .catch((err: Error) => {
        this.log(err)
        homebridgeAccessory.airInfo = null
        callback()
      })
      .finally(() => {
        this.currentAirInfoExecution--
        if (this.airInfoExecutionPending.length) {
          const args = this.airInfoExecutionPending.shift()
          this.log('Dequeuing remote request for:', args[3].name, '-', args[1].displayName)
          this.proxyAirInfo.apply(this, args)
        }
      })
    } else {
      this.log('Queing remote request data for:', homebridgeAccessory.name, '-', characteristic.displayName)
      this.airInfoExecutionPending.push(arguments)
    }
  }

  getAccessoryValue (callback: any, characteristic: any, service: any, homebridgeAccessory: any, value: any): void {
    let accessoryInfo = homebridgeAccessory.airInfo
    if (characteristic.UUID === homebridgeAccessory.platform.CurrentHeatingCoolingStateUUID) {
      if (accessoryInfo.Power === false) {
        callback(undefined, Characteristic.CurrentHeatingCoolingState.OFF)
      } else {
        switch (accessoryInfo.OperationMode) {
          case 1:
            return callback(undefined,Characteristic.CurrentHeatingCoolingState.HEAT)
          case 3:
            return callback(undefined, Characteristic.CurrentHeatingCoolingState.COOL)
          default:
            // Melcloud can return also 2 (deumidity), 7
            // (Ventilation), 8 (auto) We try to return 5 which is
            // undefined in homekit
            return callback(undefined, 5)
        }
      }
    } else if (
      characteristic.UUID === homebridgeAccessory.platform.TargetHeatingCoolingStateUUID) {
      if (accessoryInfo.Power === false) {
        callback(undefined, Characteristic.TargetHeatingCoolingState.OFF)
      } else {
        switch (accessoryInfo.OperationMode) {
          case 1:
            return callback(undefined, Characteristic.TargetHeatingCoolingState.HEAT)
          case 3:
            return callback(undefined, Characteristic.TargetHeatingCoolingState.COOL)
          case 8:
            return callback(undefined, Characteristic.TargetHeatingCoolingState.AUTO)
          default:
            // Melcloud can return also 2 (deumidity), 7
            // (Ventilation) We try to return 5 which is undefined
            // in homekit
            return callback(undefined, 5)
        }
      }
    } else if (characteristic.UUID === homebridgeAccessory.platform.CurrentTemperatureUUID) {
      return callback(undefined, accessoryInfo.RoomTemperature)
    } else if (characteristic.UUID === homebridgeAccessory.platform.TargetTemperatureUUID) {
      return callback(undefined, accessoryInfo.SetTemperature)
    } else if (characteristic.UUID === homebridgeAccessory.platform.TemperatureDisplayUnitsUUID) {
      if (homebridgeAccessory.platform.UseFahrenheit) {
        return callback(undefined, Characteristic.TemperatureDisplayUnits.FAHRENHEIT)
      } else {
        return callback(undefined, Characteristic.TemperatureDisplayUnits.CELSIUS)
      }
    } else if (characteristic.UUID === homebridgeAccessory.platform.RotationSpeedUUID) {
      let SetFanSpeed = accessoryInfo.SetFanSpeed
      let NumberOfFanSpeeds = accessoryInfo.NumberOfFanSpeeds
      let fanSpeed = SetFanSpeed / NumberOfFanSpeeds * 100.0
      return callback(undefined, fanSpeed)
    } else if (characteristic.UUID === homebridgeAccessory.platform.CurrentHorizontalTiltAngleUUID || characteristic.UUID === homebridgeAccessory.platform.TargetHorizontalTiltAngleUUID) {
      let VaneHorizontal = accessoryInfo.VaneHorizontal
      let HorizontalTilt = -90.0 + 45.0 * (VaneHorizontal - 1)
      return callback(undefined, HorizontalTilt)
    } else if (characteristic.UUID === homebridgeAccessory.platform.CurrentVerticalTiltAngleUUID || characteristic.UUID === homebridgeAccessory.platform.TargetVerticalTiltAngleUUID) {
      let VaneVertical = accessoryInfo.VaneVertical
      let VerticallTilt = 90.0 - 45.0 * (5 - VaneVertical)
      callback(undefined, VerticallTilt)
    } else {
      return callback(undefined, 0)
    }
  }

  async setAccessoryValue (callback: any, characteristic: any, service: any, homebridgeAccessory: any, value: any): Promise<any> {
    // this.log('setAccessoryValue ->', 'homebridgeAccessory:', homebridgeAccessory)
    const self = homebridgeAccessory.platform
    let accessoryInfo = homebridgeAccessory.airInfo
    if (characteristic.UUID === homebridgeAccessory.platform.TargetHeatingCoolingStateUUID) {
      switch (value) {
        case Characteristic.TargetHeatingCoolingState.OFF:
          accessoryInfo.Power = false
          accessoryInfo.EffectiveFlags = 1
          break
        case Characteristic.TargetHeatingCoolingState.HEAT:
          accessoryInfo.Power = true
          accessoryInfo.OperationMode = 1
          accessoryInfo.EffectiveFlags = 1 + 2
          break
        case Characteristic.TargetHeatingCoolingState.COOL:
          accessoryInfo.Power = true
          accessoryInfo.OperationMode = 3
          accessoryInfo.EffectiveFlags = 1 + 2
          break
        case Characteristic.TargetHeatingCoolingState.AUTO:
          accessoryInfo.Power = true
          accessoryInfo.OperationMode = 8
          accessoryInfo.EffectiveFlags = 1 + 2
          break
        default:
          return callback()
      }
    } else if (characteristic.UUID === homebridgeAccessory.platform.TargetTemperatureUUID) {
      accessoryInfo.SetTemperature = value
      accessoryInfo.EffectiveFlags = 4
    } else if (characteristic.UUID === homebridgeAccessory.platform.TemperatureDisplayUnitsUUID) {
      let UseFahrenheit = false
      if (value === Characteristic.TemperatureDisplayUnits.FAHRENHEIT) {
        UseFahrenheit = true
      }
      homebridgeAccessory.platform.updateApplicationOptions(UseFahrenheit)
      homebridgeAccessory.platform.UseFahrenheit = UseFahrenheit
      return callback()
    } else if (characteristic.UUID === homebridgeAccessory.platform.RotationSpeedUUID) {
      accessoryInfo.SetFanSpeed = (value / 100.0 * accessoryInfo.NumberOfFanSpeeds).toFixed(0)
      accessoryInfo.EffectiveFlags = 8
    } else if (characteristic.UUID === homebridgeAccessory.platform.TargetHorizontalTiltAngleUUID) {
      accessoryInfo.VaneHorizontal = ((value + 90.0) / 45.0 + 1.0).toFixed(0)
      accessoryInfo.EffectiveFlags = 256
    } else if (characteristic.UUID === homebridgeAccessory.platform.TargetVerticalTiltAngleUUID) {
      accessoryInfo.VaneVertical = ((value + 90.0) / 45.0 + 1.0).toFixed(0)
      accessoryInfo.EffectiveFlags = 16
    } else {
      return callback()
    }

    // TODO: Test if this fixes the permission issues
    homebridgeAccessory.airInfo.HasPendingCommand = true

    await self.client.setDeviceData(JSON.stringify(homebridgeAccessory.airInfo))
    .catch((err: Error) => {
      self.log(err)
    })
    .finally(() => {
      return callback()
    })
  }

  async updateApplicationOptions (UseFahrenheit: any): Promise<any> {
    await this.client.updateOptions(this.UseFahrenheit)
    .catch((err: Error) => {
      this.log(err)
    })
  }

  getInformationService (homebridgeAccessory: any) {
    const informationService = new Service.AccessoryInformation()
    .setCharacteristic(Characteristic.Name, homebridgeAccessory.name)
    .setCharacteristic(Characteristic.Manufacturer, homebridgeAccessory.manufacturer)
    .setCharacteristic(Characteristic.Model, homebridgeAccessory.model)
    .setCharacteristic(Characteristic.SerialNumber, homebridgeAccessory.serialNumber)
    return informationService
  }

  bindCharacteristicEvents (characteristic: any, service: any, homebridgeAccessory: any): void {
    let readOnly = true
    for (let perm of characteristic.props.perms) {
      if (perm === 'pw') {
        readOnly = false
      }
    }

    if (!readOnly) {
      characteristic.on('set', (value: any, callback: any, context: any) => {
        if (context !== 'fromMelcloud') {
          homebridgeAccessory.platform.proxyAirInfo(callback, characteristic, service, homebridgeAccessory, value, homebridgeAccessory.platform.setAccessoryValue)
        }
      })
    }

    characteristic.on('get', (callback: any) => {
      homebridgeAccessory.platform.proxyAirInfo(callback, characteristic, service, homebridgeAccessory, null, homebridgeAccessory.platform.getAccessoryValue)
    })
  }

  getServices (homebridgeAccessory: any): any[] {
    const services = []
    const informationService = homebridgeAccessory.platform.getInformationService(homebridgeAccessory)
    services.push(informationService)

    for (let service of homebridgeAccessory.services) {
      for (let serviceCharacteristic of service.characteristics) {
        let characteristic = service.controlService.getCharacteristic(serviceCharacteristic)
        if (characteristic === undefined) {
          characteristic = service.controlService.addCharacteristic(serviceCharacteristic)
        }

        homebridgeAccessory.platform.bindCharacteristicEvents(characteristic, service, homebridgeAccessory)
      }

      services.push(service.controlService)
    }

    return services
  }
}
