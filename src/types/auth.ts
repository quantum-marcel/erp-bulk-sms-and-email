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
}

export interface AuthUser {
  username: string
  fullName: string
  email: string | null
  role: 'admin' | 'user'
}

export interface AuthResponse {
  token: string
  user: AuthUser
}