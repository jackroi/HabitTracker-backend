// Interfaces for the HTTP responses

/**
 * Represents a generic response
 */
 export interface ResponseBody {
  error: boolean,
  statusCode: number,
}

/**
 * Represents a generic success response
 */
export interface SuccessResponseBody extends ResponseBody {
  error: false,
}

/**
 * Represents an error response
 */
export interface ErrorResponseBody extends ResponseBody {
  error: true,
  errorMessage: string,
}

export interface RootResponseBody extends SuccessResponseBody {
  apiVersion: string,
  endpoints: string[],
}

export interface LoginResponseBody extends SuccessResponseBody {
  token: string,
}

export interface RegistrationResponseBody extends SuccessResponseBody {
  token: string,
}
