export interface LdapLoginPayload {
  username: string
  password: string
}

export interface AuthApiResponse {
  access_token: string
  token_type: string
  username: string
  name: string
  email: string | null
  role?: AuthRole | AuthRoleObject | null
  companies: AuthCompany[]
  active_company: AuthCompany | null
}

export type AuthRole = 'super_admin' | 'admin'

export interface AuthRoleObject {
  name?: AuthRole | string
  code?: AuthRole | string
  role?: AuthRole | string
}

export interface AuthUser {
  id?: number
  username: string
  fullName: string
  email: string | null
  role: AuthRole
}

export interface AuthCompany {
  id: number
  name: string
}

export interface SelectCompanyPayload {
  company_id: number
}

export interface SelectCompanyResponse {
  access_token: string
  company: AuthCompany
}

export interface AuthMeResponse {
  user_id: number
  username: string
  name: string | null
  email: string | null
  role?: AuthRole | AuthRoleObject | null
  company_id: number | null
  company_name: string | null
}

export interface AuthResponse {
  token: string
  user: AuthUser
}
