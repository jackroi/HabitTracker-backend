// Interfaces for the HTTP requests

export interface RequestBody {
}

export interface RegistrationRequestBody extends RequestBody {
  name: string,
  email: string,
  password: string,
}

// Type guard function
export function isRegistrationRequestBody(arg: any): arg is RegistrationRequestBody {
  return arg
    && arg.name           // It can't be the empty string
    && typeof (arg.name) === 'string'
    && arg.email
    && typeof (arg.email) === 'string'
    && arg.password
    && typeof (arg.password) === 'string';
}

export interface UpdateCategoryNameRequestBody extends RequestBody {
  name: string,
}

// Type guard function
export function isUpdateCategoryNameRequestBody(arg: any): arg is UpdateCategoryNameRequestBody {
  return arg
    && arg.name           // It can't be the empty string
    && typeof (arg.name) === 'string';
}
