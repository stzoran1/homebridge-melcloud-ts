import {
  API,
  APIEvent,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformAccessoryEvent,
  PlatformConfig,
  Characteristic,
  Service
} from 'homebridge'
import * as _ from 'lodash'
import { IDeviceBuilding, IDevice, IMELCloudAPIClient, MELCloudAPIClient } from '../api/client'
import { IMELCloudConfig, PLATFORM_NAME, PLUGIN_NAME, validateMELCloudConfig } from '../config'
import  { IMELCloudBridgedAccessory } from '../accessory/iAccessory'
import RoomTemperatureAccessory from '../accessory'

export interface IMELCloudPlatform extends DynamicPlatformPlugin {
  readonly log: Logger
  readonly config: IMELCloudConfig
  readonly api: API

  readonly Service: typeof Service
  readonly Characteristic: typeof Characteristic

  /*readonly*/ accessories: Array<PlatformAccessory>

  readonly client: IMELCloudAPIClient

  discoverDevices(): Promise<void>
  getDevices(): Promise<void>
  createAccessories(building: IDeviceBuilding, devices: Array<IDevice> | null): Promise<void>

}

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export default class MELCloudPlatform implements IMELCloudPlatform {
  // #region DynamicPlatformPlugin
  public readonly log: Logger
  public readonly config: IMELCloudConfig
  public readonly api: API

  public readonly Service: typeof Service
  public readonly Characteristic: typeof Characteristic

  public /*readonly*/ accessories: Array<PlatformAccessory> = []
  // #endregion

  // #region MELCloudPlatform - Configuration
  public readonly client: IMELCloudAPIClient
  // #endregion


  constructor(log: Logger, config: PlatformConfig | IMELCloudConfig, api: API) {
    // Store a reference to the logger
    if (!log) {
      throw new Error('Invalid or null Homebridge logger')
    }
    this.log = log

    // Store a reference to the config
    if (!config) {
      throw new Error('Invalid or null Homebridge platform config')
    }
    validateMELCloudConfig(config as IMELCloudConfig)
    this.config = config as IMELCloudConfig

    // Store a reference to the HAP API
    if (!api) {
      throw new Error('Invalid or null Homebridge API')
    }
    this.api = api

    this.Service = this.api.hap.Service
    this.Characteristic = this.api.hap.Characteristic

    // Create a new MELCloud API client
    this.client = new MELCloudAPIClient(this.log, this.config, this.api.user.storagePath())
    if (!this.client) {
      throw new Error('Failed to create MELCloud API client')
    }

    this.log.debug('Finished initializing platform:', this.config.name)

    /*
     * When this event is fired, homebridge restored all cached accessories from disk and did call their respective
     * `configureAccessory` method for all of them. Dynamic Platform plugins should only register new accessories
     * after this event was fired, in order to ensure they weren't added to homebridge already.
     * This event can also be used to start discovery of new accessories.
     */
    this.api.on(APIEvent.DID_FINISH_LAUNCHING, () => {
      this.log.debug('Executed didFinishLaunching callback')

      // run the method to discover / register your devices as accessories
      this.discoverDevices()
        .then(() => {
          this.log.debug('Device discovery successful')
        })
        .catch((err: Error) => {
          this.log.error('Device discovery failed:', err)
        })
    })
  }

  /*
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  // FIXME: How can se use MELCloudBridgedAccessory her instead of PlatformAccessory?
  configureAccessory(accessory: PlatformAccessory): void {
    this.log.info('Loading accessory from cache:', accessory.displayName)

    // identify the accessory
    accessory.on(PlatformAccessoryEvent.IDENTIFY, () => {
      this.log.info('%s identified!', accessory.displayName)
    })

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory)
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  async discoverDevices(): Promise<void> {
    this.log.info('Discovering devices as accessories')

    // Get devices from MELCloud and add them as HomeKit accessories
    await this.getDevices()

  }

  // FIXME: This should re-use existing accessories and not always recreate them?!
  //        See here for an example: https://github.com/homebridge/homebridge-plugin-template/blob/master/src/platform.ts
  async getDevices(): Promise<void> {
    this.log.debug('Getting devices..')
    return this.client.listDevices()
      .then(buildings => {
        // Prepare an array of accessories
        // const foundAccessories = [] as Array<PlatformAccessory>

        // Parse and loop through all buildings
        for (const building of buildings) {
          if (building) {
            this.log.debug('Building:', building)

            // (Re)create the accessories
            if (building.Structure) {
              this.createAccessories(building, building.Structure.Devices)

              // Parse and loop through all floors
              if (building.Structure.Floors) {
                for (const floor of building.Structure.Floors) {
                  this.log.debug('Floor:', floor)

                  // (Re)create the accessories
                  this.createAccessories(building, floor.Devices)

                  // Parse and loop through all floor areas
                  if (floor.Areas) {
                    for (const floorArea of floor.Areas) {
                      this.log.debug('Floor area:', floorArea)

                      // (Re)create the accessories
                      this.createAccessories(building, floorArea.Devices)
                    }
                  }
                }
              }

              // Parse and loop through all building areas
              if (building.Structure.Areas) {
                for (const buildingArea of building.Structure.Areas) {
                  this.log.debug('Building area:', buildingArea)

                  // (Re)create the accessories
                  this.createAccessories(building, buildingArea.Devices)
                }
              }
            }
          }
        }
      })
  }

  async createAccessories(building: IDeviceBuilding, devices: Array<IDevice> | null): Promise<void> {
    this.log.debug('Creating accessories..')

    // Loop through all MELCloud devices
    if (devices) {
      for (const device of devices) {
        // generate a unique id for the accessory this should be generated from
        // something globally unique, but constant, for example, the device serial
        // number or MAC address
        if (device.DeviceID) {
          const uuid = this.api.hap.uuid.generate(device.DeviceID.toString())

          // see if an accessory with the same uuid has already been registered and restored from
          // the cached devices we stored in the `configureAccessory` method above
          const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid)

          if (existingAccessory) {
            // the accessory already exists
            this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName)

            // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
            // existingAccessory.context.device = device;
            // this.api.updatePlatformAccessories([existingAccessory]);

            // TODO: Do we need to do this?
            // Update existing accessory context
            existingAccessory.context.device = device
            existingAccessory.context.deviceDetails = await this.client.getDevice(device.DeviceID, device.BuildingID)
            this.api.updatePlatformAccessories([existingAccessory])

            // create the accessory handler for the restored accessory
            // this is imported from `platformAccessory.ts`
            new RoomTemperatureAccessory(this, existingAccessory)

            // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
            // remove platform accessories when no longer present
            // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
            // this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
          } else if (device.DeviceName) {
            // the accessory does not yet exist, so we need to create it
            this.log.info('Adding new accessory:', device.DeviceName)

            // create a new accessory
            const accessory = new this.api.platformAccessory(device.DeviceName, uuid)

            // store a copy of the device object in the `accessory.context`
            // the `context` property can be used to store any data about the accessory you may need
            accessory.context.device = device
            accessory.context.deviceDetails = await this.client.getDevice(device.DeviceID, device.BuildingID)

            // create the accessory handler for the newly create accessory
            // this is imported from `platformAccessory.ts`
            new RoomTemperatureAccessory(this, accessory)

            // link the accessory to your platform
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory])
          }

        }
      }
    }
  }
}
