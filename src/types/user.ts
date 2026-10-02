import type * as Backend from './backend'

export type AppUser = Backend.UserOut
export type UpdateUserPayload = Backend.UserUpdate
export type UserCompanyAssignment = Backend.UserCompanyWithUserOut
export type CreateUserPayload = Backend.AdminUserCreate
