import type * as Backend from './backend'

export interface CompanySummary {
  id: number
  name: string
}

export type Company = Backend.CompanyOut

export type CompanyCreateResult = Backend.CompanyCreateResult

export type CreateCompanyPayload = Backend.CompanyCreate

export type UpdateCompanyPayload = Backend.CompanyUpdate

export type SmsConfig = Backend.SmsConfigOut

export type SmsConfigUpsert = Backend.SmsConfigUpsert
