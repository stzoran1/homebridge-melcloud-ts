import { Logging, PlatformConfig } from 'homebridge'
import { Response, ResponseAsJSON } from 'request'
import { IMELCloudConfig } from '../config'

import request from 'request-promise-native'
// import url from 'url'

const MELCLOUD_API_ROOT = 'https://app.melcloud.com/Mitsubishi.Wifi.Client'
const MELCLOUD_API_LOGIN = 'Login/ClientLogin'
const MELCLOUD_API_LIST_DEVICES = 'User/ListDevices'
const MELCLOUD_API_GET_DEVICE = 'Device/Get'
const MELCLOUD_API_SET_DEVICE = 'Device/SetAta'
const MELCLOUD_API_UPDATE_OPTIONS = 'User/UpdateApplicationOptions'

export interface IMELCloudAPIClient {
  log: Logging
  config: IMELCloudConfig
  ContextKey: null
  get (url: string, formData?: { [key: string]: unknown }, headers?: { [key: string]: unknown }): Promise<ResponseAsJSON>
  post (url: string, formData?: { [key: string]: unknown }, headers?: { [key: string]: unknown }): Promise<ResponseAsJSON>
  login (): Promise<unknown> // TODO: Add proper type support
  listDevices (): Promise<ResponseAsJSON> // TODO: Add proper type support
  getDevice (deviceId: string, buildingId: string): Promise<unknown> // TODO: Add proper type support
  updateOptions (useFahrenheit: boolean): Promise<unknown> // TODO: Add proper type support
  setDeviceData (data: unknown): Promise<unknown> // TODO: Add proper type support
}

export class MELCloudAPIClient implements IMELCloudAPIClient {
  log: Logging
  config: IMELCloudConfig
  ContextKey: null

  constructor(log: Logging, config: IMELCloudConfig) {
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
    this.ContextKey = null
  }

  async get(url: string, formData?: { [key: string]: unknown }, headers?: { [key: string]: unknown }): Promise<ResponseAsJSON> {
    // this.log('GET', url, formData, headers)
    const response: Response = await request.get({ url: url, formData: formData, headers: headers })
    return response.toJSON()
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

  async post(url: string, formData?: { [key: string]: unknown }, headers?: { [key: string]: unknown }, body?: unknown): Promise<ResponseAsJSON> {
    // this.log('POST', url, formData, headers)
    const response: Response = await request.post({ url: url, formData: formData, headers: headers, body: body })
    return response.toJSON()
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

  // TODO: Add proper type support
  async login(): Promise<unknown> {
    // this.log('LOGIN')
    const response = await this.post(`${MELCLOUD_API_ROOT}/${MELCLOUD_API_LOGIN}`, {
      AppVersion: '1.19.0.8',
      CaptchaChallenge: '',
      CaptchaResponse: '',
      Email: this.config.username,
      Language: this.config.language,
      Password: this.config.password,
      Persist: 'true'
    }) as unknown as { LoginData: { ContextKey: null } }
    if (!response) {
      throw new Error(`Failed to login: invalid JSON response: ${response}`)
    }
    this.ContextKey = response.LoginData.ContextKey
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

  // TODO: Add proper type support
  async listDevices(): Promise<ResponseAsJSON> {
    // this.log('LIST DEVICES')
    const response = await this.get(`${MELCLOUD_API_ROOT}/${MELCLOUD_API_LIST_DEVICES}`, undefined, { 'X-MitsContextKey': this.ContextKey })
    if (!response) {
      throw new Error(`Failed to list devices: invalid JSON response: ${response}`)
    }
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

  // TODO: Add proper type support
  async getDevice(deviceId: string, buildingId: string): Promise<unknown> {
    // this.log('GET DEVICE', deviceId, buildingId)
    const response = await this.get(`${MELCLOUD_API_ROOT}/${MELCLOUD_API_GET_DEVICE}?id=${deviceId}&BuildingID=${buildingId}`, undefined, { 'X-MitsContextKey': this.ContextKey })
    if (!response) {
      throw new Error(`Failed to get device: invalid JSON response: ${response}`)
    }
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

  // TODO: Add proper type support
  async updateOptions(useFahrenheit: boolean): Promise<unknown> {
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
    // this.log('SET DEVICE DATA', data)
    const response = await this.post(`${MELCLOUD_API_ROOT}/${MELCLOUD_API_SET_DEVICE}`, undefined, { 'X-MitsContextKey': this.ContextKey, 'content-type': 'application/json' }, data)
    if (!response) {
      throw new Error(`Failed to set device data: invalid JSON response: ${response}`)
    }
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
