export interface CompanySummary {
  id: number
  name: string
}

export interface Company extends CompanySummary {
  created_at: string
}

export interface CreateCompanyPayload {
  name: string
}

export interface UpdateCompanyPayload {
  name?: string | null
}
