import { IMELCloudConfig } from '../config'

const request = require('request-promise-native')
// import request from 'request-promise-native'
// import url from 'url'

const MELCLOUD_API_ROOT = 'https://app.melcloud.com/Mitsubishi.Wifi.Client'
const MELCLOUD_API_LOGIN = 'Login/ClientLogin'
const MELCLOUD_API_LIST_DEVICES = 'User/ListDevices'
const MELCLOUD_API_GET_DEVICE = 'Device/Get'
const MELCLOUD_API_SET_DEVICE = 'Device/SetAta'
const MELCLOUD_API_UPDATE_OPTIONS = 'User/UpdateApplicationOptions'

export interface IMELCloudAPIClient {
  log: Function
  config: IMELCloudConfig
  ContextKey: null
  get (url: string, formData?: any, headers?: any): Promise<any>
  post (url: string, formData?: any, headers?: any): Promise<any>
  login (): Promise<any>
  listDevices (): Promise<any>
  getDevice (deviceId: any, buildingId: any): Promise<any>
  updateOptions (useFahrenheit: any): Promise<any>
  setDeviceData (data: any): Promise<any>
}

export class MELCloudAPIClient implements IMELCloudAPIClient {
  log: Function
  config: IMELCloudConfig
  ContextKey: null

  constructor (log: Function, config: IMELCloudConfig) {
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

  async get (url: string, formData?: any, headers?: any): Promise<any> {
    // this.log('GET', url, formData, headers)
    return new Promise(async (resolve, reject) => {
      await request.get({ url: url, formData: formData, headers: headers })
      .then((response: any) => {
        try {
          const jsonResponse = JSON.parse(response)
          return resolve(jsonResponse)
        } catch (err) {
          return reject(new Error('Failed to parse response as JSON: ' + err.message))
        }
      })
      .catch((err: Error) => {
        return reject(err)
      })
    })
  }

  async post (url: string, formData?: any, headers?: any, body?: any): Promise<any> {
    // this.log('POST', url, formData, headers)
    return new Promise(async (resolve, reject) => {
      await request.post({ url: url, formData: formData, headers: headers, body: body })
      .then((response: any) => {
        try {
          const jsonResponse = JSON.parse(response)
          return resolve(jsonResponse)
        } catch (err) {
          return reject(new Error('Failed to parse response as JSON: ' + err.message))
        }
      })
      .catch((err: Error) => {
        return reject(err)
      })
    })
  }

  async login (): Promise<any> {
    // this.log('LOGIN')
    return new Promise(async (resolve, reject) => {
      await this.post(`${MELCLOUD_API_ROOT}/${MELCLOUD_API_LOGIN}`, {
        AppVersion: '1.9.3.0',
        CaptchaChallenge: '',
        CaptchaResponse: '',
        Email: this.config.username,
        Language: this.config.language,
        Password: this.config.password,
        Persist: 'true'
      })
      .then((response: any) => {
        this.ContextKey = response.LoginData.ContextKey
        // this.log('ContextKey:', this.ContextKey)
        return resolve(response.LoginData)
      })
      .catch((err: Error) => {
        return reject(new Error('Failed to login: ' + err.message))
      })
    })
  }

  async listDevices (): Promise<any> {
    // this.log('LIST DEVICES')
    return new Promise(async (resolve, reject) => {
      await this.get(`${MELCLOUD_API_ROOT}/${MELCLOUD_API_LIST_DEVICES}`, undefined, { 'X-MitsContextKey': this.ContextKey })
      .then((response: any) => {
        return resolve(response)
      })
      .catch((err: Error) => {
        return reject(new Error('Failed to list devices: ' + err.message))
      })
    })
  }

  async getDevice (deviceId: any, buildingId: any): Promise<any> {
    // this.log('GET DEVICE', deviceId, buildingId)
    return new Promise(async (resolve, reject) => {
      await this.get(`${MELCLOUD_API_ROOT}/${MELCLOUD_API_GET_DEVICE}?id=${deviceId}&BuildingID=${buildingId}`, undefined, { 'X-MitsContextKey': this.ContextKey })
      .then((response: any) => {
        if (JSON.stringify(response).search('<!DOCTYPE html>') !== -1) {
          return reject(new Error('Failed to get device: invalid JSON response, HTML detected'))
        }
        return resolve(response)
      })
      .catch((err: Error) => {
        return reject(new Error('Failed to get device: ' + err.message))
      })
    })
  }

  async updateOptions (useFahrenheit: any): Promise<any> {
    // this.log('UPDATE OPTIONS', useFahrenheit)
    return new Promise(async (resolve, reject) => {
      await this.post(`${MELCLOUD_API_ROOT}/${MELCLOUD_API_UPDATE_OPTIONS}`, `{
        UseFahrenheit: ${useFahrenheit},
        EmailOnCommsError: false,
        EmailOnUnitError: false,
        EmailCommsErrors: 1,
        EmailUnitErrors: 1,
        RestorePages: false,
        MarketingCommunication: false,
        AlternateEmailAddress: "",
        Fred: 4
      }`, { 'X-MitsContextKey': this.ContextKey, 'Content-Type': 'application/json' })
      .then((response: any) => {
        return resolve(response)
      })
      .catch((err: Error) => {
        return reject(new Error('Failed to update options: ' + err.message))
      })
    })
  }

  async setDeviceData (data: any): Promise<any> {
    // this.log('SET DEVICE DATA', data)
    return new Promise(async (resolve, reject) => {
      await this.post(`${MELCLOUD_API_ROOT}/${MELCLOUD_API_SET_DEVICE}`, undefined, { 'X-MitsContextKey': this.ContextKey, 'content-type': 'application/json' }, data)
      .then((response: any) => {
        return resolve(response)
      })
      .catch((err: Error) => {
        return reject(new Error('Failed to set device data: ' + err.message))
      })
    })
  }
}
