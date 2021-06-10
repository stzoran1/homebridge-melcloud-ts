/* eslint-disable @typescript-eslint/no-explicit-any */
import { API, Logger } from 'homebridge'
// import { Response, ResponseAsJSON } from 'request'
import { IMELCloudConfig, MELCloudLanguage } from '../config'

// import request from 'request-promise-native'
import fetch from 'node-fetch'
// import url from 'url'

import * as storage from 'node-persist'

const MELCLOUD_API_ROOT = 'https://app.melcloud.com/Mitsubishi.Wifi.Client'
const MELCLOUD_API_LOGIN = 'Login/ClientLogin'
const MELCLOUD_API_LIST_DEVICES = 'User/ListDevices'
const MELCLOUD_API_GET_DEVICE = 'Device/Get'
const MELCLOUD_API_SET_DEVICE = 'Device/SetAta'
const MELCLOUD_API_UPDATE_OPTIONS = 'User/UpdateApplicationOptions'

export interface ILoginResponse {
  ErrorId: number | null
  ErrorMessage: string | null
  LoginStatus: number | null
  UserId: number | null
  RandomKey: string | null
  AppVersionAnnouncement: string | null
  LoginData: ILoginData | null
  ListPendingInvite: Array<unknown> | null
  ListOwnershipChangeRequest: Array<unknown> | null
  ListPendingAnnouncement: Array<unknown> | null
  LoginMinutes: number | null
  LoginAttempts: number | null
}

export interface ILoginData {
  ContextKey: string | null
  Client: number | null
  Terms: number | null
  AL: number | null
  ML: number | null
  CMI: boolean | null
  IsStaff: boolean | null
  CUTF: boolean | null
  CAA: boolean | null
  ReceiveCountryNotifications: boolean | null
  ReceiveAllNotifications: boolean | null
  CACA: false | null
  CAGA: false | null
  MaximumDevices: number | null
  ShowDiagnostics: false | null
  Language: MELCloudLanguage | null
  Country: number | null
  RealClient: number | null
  Name: string | null
  UseFahrenheit: boolean | null
  Duration: number | null
  Expiry: string | null // FIXME: Parse as ISO string (2022-06-09T10:40:24.27), also re-use ContextKey until hitting expiration date?
  CMSC: boolean | null
  PartnerApplicationVersion: null
  EmailSettingsReminderShown: boolean | null
  EmailUnitErrors: number | null
  EmailCommsErrors: number | null
  ChartSeriesHidden: number | null
  IsImpersonated: boolean | null
  LanguageCode: string | null
  CountryName: string | null
  CurrencySymbol: string | null
  SupportEmailAddress: string | null
  DateSeperator: string | null
  TimeSeperator: string | null
  AtwLogoFile: string | null
  DECCReport: boolean | null
  CSVReport1min: boolean | null
  HidePresetPanel: boolean | null
  EmailSettingsReminderRequired: boolean | null
  TermsText: string | null
  MapView: boolean | null
  MapZoom: number | null
  MapLongitude: number | null
  MapLatitude: number | null
}

export interface IDeviceBuilding {
  // FIXME: Implement all the missing things!
  ID: number | null
  Structure: {
    Floors: Array<{
      Devices: Array<IDevice> | null
      Areas: Array<{
        Devices: Array<IDevice> | null
      }> | null
    }> | null
    Areas: Array<{
      Devices: Array<IDevice> | null
    }> | null
    Devices: Array<IDevice> | null
  } | null
}

export interface IDevice {
  DeviceID: number | null
  DeviceName: string | null
  BuildingID: number | null
  SerialNumber: string | null
  Device: {
    DeviceType: number | null
  } | null
}

export interface IDeviceGet {
  // FIXME: Implement all the missing things!
  EffectiveFlags: number | null
  LocalIPAddress: string | null
  RoomTemperature: number | null
  SetTemperature: number | null
  SetFanSpeed: number | null
  OperationMode: number | null
  VaneHorizontal: number | null
  VaneVertical: number | null
  Name: string | null
  NumberOfFanSpeeds: number | null
  WeatherObservations: Array<unknown> | null
  ErrorMessage: string | null
  ErrorCode: number | null
  DefaultHeatingSetTemperature: number | null
  DefaultCoolingSetTemperature: number | null
  HideVaneControls: boolean | null
  HideDryModeControl: boolean | null
  RoomTemperatureLabel: number | null
  InStandbyMode: boolean | null
  TemperatureIncrementOverride: number | null
  ProhibitSetTemperature: boolean | null
  ProhibitOperationMode: boolean | null
  ProhibitPower: boolean | null
  DeviceID: number | null
  DeviceType: number | null
  LastCommunication: string | null
  NextCommunication: string | null
  Power: boolean | null
  HasPendingCommand: boolean | null
  Offline: boolean | null
  Scene: unknown | null
  SceneOwner: unknown | null
}

export interface IMELCloudAPIClient {
  log: Logger
  config: IMELCloudConfig
  StoragePath: string | null
  ContextKey: string | null
  ContextKeyExpirationDate: Date | null
  UseFahrenheit: boolean | null
  isContextKeyValid: boolean
  get (url: string, formData?: { [key: string]: unknown }, headers?: { [key: string]: unknown }): Promise<any>
  post (url: string, formData?: { [key: string]: unknown }, headers?: { [key: string]: unknown }): Promise<any>
  login (): Promise<ILoginData | null>
  listDevices (): Promise<Array<IDeviceBuilding>>
  getDevice (deviceId: string | null, buildingId: number | null): Promise<IDeviceGet>
  updateOptions (useFahrenheit: boolean): Promise<unknown> // FIXME: Add proper type support
  setDeviceData (data: unknown): Promise<unknown> // FIXME: Add proper type support
}

export class MELCloudAPIClient implements IMELCloudAPIClient {
  log: Logger
  config: IMELCloudConfig
  StoragePath: string | null
  ContextKey: string | null
  ContextKeyExpirationDate: Date | null
  UseFahrenheit: boolean | null

  get isContextKeyValid(): boolean {
    if (!this.ContextKey || this.ContextKey.length < 1) {
      return false
    }
    if (!this.ContextKeyExpirationDate) {
      return false
    }
    const nowDate = new Date()
    nowDate.setHours(0)
    nowDate.setMinutes(0)
    nowDate.setSeconds(0)
    nowDate.setMilliseconds(0)
    if (this.ContextKeyExpirationDate <= nowDate) {
      return false
    }
    return true
  }

  constructor(log: Logger, config: IMELCloudConfig, storagePath: string | null) {
    // Validate and store a reference to the logger
    if (!log) {
      throw new Error('Invalid or null Homebridge logger')
    }
    this.log = log

    // Validate and store the config
    if (!config) {
      throw new Error('Invalid or missing config')
    }
    this.config = config

    // MELCloud login token (or "context key")
    this.StoragePath = storagePath
    this.ContextKey = null
    this.ContextKeyExpirationDate = null
    this.UseFahrenheit = null

    // Initialize and load settings from storage
    storage.init()
      .then(async() => {
        this.ContextKey = await storage.getItem('ContextKey') || null
        this.log.debug('Loaded ContextKey from storage:', this.ContextKey)

        this.ContextKeyExpirationDate = await storage.getItem('ContextKeyExpirationDate') || null
        this.log.debug('Loaded ContextKeyExpirationDate from storage:', this.ContextKeyExpirationDate)

        this.UseFahrenheit = await storage.getItem('UseFahrenheit') || null
        this.log.debug('Loaded UseFahrenheit from storage:', this.UseFahrenheit)
      })
  }

  async get(url: string, formData?: { [key: string]: unknown }, headers?: { [key: string]: unknown }): Promise<any> {
    this.log.info('GET', url, formData, headers)
    formData = JSON.stringify(formData) as any
    if (!headers) {
      headers = {
        'Content-Type': 'application/json'
      }
    }
    const response = await fetch(url, {
      method: 'GET',
      body: formData as any,
      headers: headers as any
    })
    return await response.json()
    // const response: Response = await request.get({ url: url, formData: formData, headers: headers })
    // return response.toJSON()
    // return new Promise(async(resolve, reject) => {
    //   await request.get({ url: url, formData: formData, headers: headers })
    //     .then((response: Response) => {
    //       try {
    //         const jsonResponse = JSON.parse(response)
    //         return resolve(jsonResponse)
    //       } catch (err) {
    //         return reject(new Error('Failed to parse response as JSON: ' + err.message))
    //       }
    //     })
    //     .catch((err: Error) => {
    //       return reject(err)
    //     })
    // })
  }

  async post(url: string, formData?: { [key: string]: unknown }, headers?: { [key: string]: unknown }, body?: unknown): Promise<any> {
    this.log.info('POST', url, formData, headers, body)
    if (!formData) {
      formData = body as any
    }
    formData = JSON.stringify(formData) as any
    if (!headers) {
      headers = {
        'Content-Type': 'application/json'
      }
    }
    const response = await fetch(url, {
      method: 'POST',
      body: formData as any,
      headers: headers as any
    })
    return await response.json()
    // const response: Response = await request.post({ url: url, formData: formData, headers: headers, body: body })
    // return response.toJSON()
    // return new Promise(async(resolve, reject) => {
    //   await request.post({ url: url, formData: formData, headers: headers, body: body })
    //     .then((response: Response) => {
    //       try {
    //         const jsonResponse = JSON.parse(response)
    //         return resolve(jsonResponse)
    //       } catch (err) {
    //         return reject(new Error('Failed to parse response as JSON: ' + err.message))
    //       }
    //     })
    //     .catch((err: Error) => {
    //       return reject(err)
    //     })
    // })
  }

  async login(): Promise<ILoginData | null> {
    this.log.debug('Logging in')

    // this.log('LOGIN')
    // Return immediately if the API key is still valid
    if (this.isContextKeyValid) {
      this.log.debug('ContextKey is still valid, skipping login')
      return null
    } else {
      this.log.info('No login info found, attempting to log in')
    }

    const response = await this.post(`${MELCLOUD_API_ROOT}/${MELCLOUD_API_LOGIN}`, {
      AppVersion: '1.19.0.8',
      CaptchaChallenge: '',
      CaptchaResponse: '',
      Email: this.config.username,
      Language: this.config.language,
      Password: this.config.password,
      Persist: 'true'
    }) as ILoginResponse
    if (!response) {
      throw new Error(`Failed to login: invalid JSON response: ${JSON.stringify(response)}`)
    }
    this.log.info('login -> response:', JSON.stringify(response))
    if (response.LoginData) {
      this.ContextKey = response.LoginData.ContextKey
      await storage.setItem('ContextKey', this.ContextKey)
      if (response.LoginData.Expiry) {
        this.ContextKeyExpirationDate = new Date(response.LoginData.Expiry)
        this.ContextKeyExpirationDate.setHours(0)
        this.ContextKeyExpirationDate.setMinutes(0)
        this.ContextKeyExpirationDate.setSeconds(0)
        this.ContextKeyExpirationDate.setMilliseconds(0)
        await storage.setItem('ContextKeyExpirationDate', this.ContextKeyExpirationDate)
      }
      this.UseFahrenheit = response.LoginData.UseFahrenheit
      await storage.setItem('UseFahrenheit', this.UseFahrenheit)
    } else {
      throw new Error(`Failed to login: failed to parse response: ${JSON.stringify(response)}`)
    }
    return response.LoginData
    // return new Promise(async(resolve, reject) => {
    //   await this.post(`${MELCLOUD_API_ROOT}/${MELCLOUD_API_LOGIN}`, {
    //     AppVersion: '1.9.3.0',
    //     CaptchaChallenge: '',
    //     CaptchaResponse: '',
    //     Email: this.config.username,
    //     Language: this.config.language,
    //     Password: this.config.password,
    //     Persist: 'true'
    //   })
    //     .then((response: any) => {
    //       this.ContextKey = response.LoginData.ContextKey
    //       // this.log('ContextKey:', this.ContextKey)
    //       return resolve(response.LoginData)
    //     })
    //     .catch((err: Error) => {
    //       return reject(new Error('Failed to login: ' + err.message))
    //     })
    // })
  }

  async listDevices(): Promise<Array<IDeviceBuilding>> {
    this.log.debug('Getting list of devices')

    // Check if we need to login first
    await this.login()

    // this.log('LIST DEVICES')
    const response = await this.get(`${MELCLOUD_API_ROOT}/${MELCLOUD_API_LIST_DEVICES}`, undefined, { 'X-MitsContextKey': this.ContextKey }) as Array<IDeviceBuilding>
    if (!response) {
      throw new Error(`Failed to list devices: invalid JSON response: ${JSON.stringify(response)}`)
    }
    this.log.info('listDevices:', JSON.stringify(response))
    return response
    // return new Promise(async(resolve, reject) => {
    //   await this.get(`${MELCLOUD_API_ROOT}/${MELCLOUD_API_LIST_DEVICES}`, undefined, { 'X-MitsContextKey': this.ContextKey })
    //     .then((response: unknown) => {
    //       return resolve(response)
    //     })
    //     .catch((err: Error) => {
    //       return reject(new Error('Failed to list devices: ' + err.message))
    //     })
    // })
  }

  async getDevice(deviceId: string | null, buildingId: number | null): Promise<IDeviceGet> {
    this.log.debug('Getting device with DeviceID', deviceId, 'and BuildingID', buildingId)

    // Check if we need to login first
    await this.login()

    // this.log('GET DEVICE', deviceId, buildingId)
    const response = await this.get(`${MELCLOUD_API_ROOT}/${MELCLOUD_API_GET_DEVICE}?id=${deviceId}&BuildingID=${buildingId}`, undefined, { 'X-MitsContextKey': this.ContextKey }) as IDeviceGet
    if (!response) {
      throw new Error(`Failed to get device: invalid JSON response: ${JSON.stringify(response)}`)
    }
    this.log.info('getDevice -> response:', JSON.stringify(response))
    return response
    // return new Promise(async(resolve, reject) => {
    //   await this.get(`${MELCLOUD_API_ROOT}/${MELCLOUD_API_GET_DEVICE}?id=${deviceId}&BuildingID=${buildingId}`, undefined, { 'X-MitsContextKey': this.ContextKey })
    //     .then((response: unknown) => {
    //       if (JSON.stringify(response).search('<!DOCTYPE html>') !== -1) {
    //         return reject(new Error('Failed to get device: invalid JSON response, HTML detected'))
    //       }
    //       return resolve(response)
    //     })
    //     .catch((err: Error) => {
    //       return reject(new Error('Failed to get device: ' + err.message))
    //     })
    // })
  }

  // FIXME: Actually call this and implement it!
  // TODO: Add proper type support
  async updateOptions(useFahrenheit: boolean): Promise<unknown> {
    // Check if we need to login first
    await this.login()

    // this.log('UPDATE OPTIONS', useFahrenheit)
    // FIXME: Why were we trying to send this as a string instead of as an object, like every other request?
    const response = await this.post(`${MELCLOUD_API_ROOT}/${MELCLOUD_API_UPDATE_OPTIONS}`, {
      UseFahrenheit: useFahrenheit,
      EmailOnCommsError: false,
      EmailOnUnitError: false,
      EmailCommsErrors: 1,
      EmailUnitErrors: 1,
      RestorePages: false,
      MarketingCommunication: false,
      AlternateEmailAddress: '',
      Fred: 4
    }, { 'X-MitsContextKey': this.ContextKey, 'Content-Type': 'application/json' })
    if (!response) {
      throw new Error(`Failed to update options: invalid JSON response: ${response}`)
    }
    this.log.info('updateOptions -> response:', JSON.stringify(response))
    return response
    // return new Promise(async(resolve, reject) => {
    //   await this.post(`${MELCLOUD_API_ROOT}/${MELCLOUD_API_UPDATE_OPTIONS}`, `{
    //     UseFahrenheit: ${useFahrenheit},
    //     EmailOnCommsError: false,
    //     EmailOnUnitError: false,
    //     EmailCommsErrors: 1,
    //     EmailUnitErrors: 1,
    //     RestorePages: false,
    //     MarketingCommunication: false,
    //     AlternateEmailAddress: "",
    //     Fred: 4
    //   }`, { 'X-MitsContextKey': this.ContextKey, 'Content-Type': 'application/json' })
    //     .then((response: any) => {
    //       return resolve(response)
    //     })
    //     .catch((err: Error) => {
    //       return reject(new Error('Failed to update options: ' + err.message))
    //     })
    // })
  }

  // TODO: Add proper type support
  async setDeviceData(data: unknown): Promise<unknown> {
    // Check if we need to login first
    await this.login()

    // this.log('SET DEVICE DATA', data)
    const response = await this.post(`${MELCLOUD_API_ROOT}/${MELCLOUD_API_SET_DEVICE}`, undefined, { 'X-MitsContextKey': this.ContextKey, 'content-type': 'application/json' }, data)
    if (!response) {
      throw new Error(`Failed to set device data: invalid JSON response: ${response}`)
    }
    this.log.info('setDeviceData -> response:', JSON.stringify(response))
    return response
    // return new Promise(async(resolve, reject) => {
    //   await this.post(`${MELCLOUD_API_ROOT}/${MELCLOUD_API_SET_DEVICE}`, undefined, { 'X-MitsContextKey': this.ContextKey, 'content-type': 'application/json' }, data)
    //     .then((response: any) => {
    //       return resolve(response)
    //     })
    //     .catch((err: Error) => {
    //       return reject(new Error('Failed to set device data: ' + err.message))
    //     })
    // })
  }
}
