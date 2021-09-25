import RoomTemperatureAccessory from '../accessory/roomTemperatureAccessory'


/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export default class OutdoorTemperatureAccessory extends RoomTemperatureAccessory {


  override async updateDeviceInfo(): Promise<void> {
    const deviceInfo = await this.getDeviceInfo()

    const Active = this.api.hap.Characteristic.Active

    const TemperatureDisplayUnits = this.api.hap.Characteristic.TemperatureDisplayUnits

    // Update active
    // TODO: Is Power same as Active?
    //this.active = deviceInfo.Power != null && deviceInfo.Power ? Active.ACTIVE : Active.INACTIVE
    this.active = Active.ACTIVE


    // Update target heater/heating cooler/cooling state
    //TODO: Handle status
    //if (deviceInfo.Power != null) {}

    // Update current temperature
    if (deviceInfo.OutdoorTemperature) {
      this.currentTemperature = deviceInfo.OutdoorTemperature
    }

    // Update temperature display units
    if (this.platform.client.UseFahrenheit) {
      this.temperatureDisplayUnits = this.platform.client.UseFahrenheit ? TemperatureDisplayUnits.FAHRENHEIT : TemperatureDisplayUnits.CELSIUS
    }

  }

}
