export interface AppUser {
  id: number
  username: string
  name: string | null
  email: string | null
  is_active: boolean
  is_admin: boolean
  last_login: string | null
  created_at: string
}

export interface UpdateUserPayload {
  name?: string | null
  email?: string | null
  is_active?: boolean | null
  is_admin?: boolean | null
}

export interface UserCompanyAssignment {
  id: number
  user_id: number
  username: string
  company_id: number
}

export interface UserCompanyAssignmentResponse {
  id: number
  user_id: number
  company_id: number
}

export interface CreateUserCompanyAssignmentPayload {
  username: string
  company_id: number
}
