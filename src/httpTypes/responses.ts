// Interfaces for the HTTP responses

import { Habit, HabitState, HabitType } from '../models/Habit';
import { HistoryEntryType } from '../models/HistoryEntry';


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

export class BadRequestErrorResponseBody implements ErrorResponseBody {
  private static readonly HTTP_BAD_REQUEST: number = 400;

  public error: true;
  public statusCode: number;
  public errorMessage: string;

  constructor (errorMessage: string) {
    this.error = true;
    this.statusCode = BadRequestErrorResponseBody.HTTP_BAD_REQUEST;
    this.errorMessage = errorMessage;
  }
}

export class InternalDbErrorResponseBody implements ErrorResponseBody {
  private static readonly HTTP_INTERNAL_SERVER_ERROR: number = 500;

  public error: true;
  public statusCode: number;
  public errorMessage: string;

  constructor () {
    this.error = true;
    this.statusCode = InternalDbErrorResponseBody.HTTP_INTERNAL_SERVER_ERROR;
    this.errorMessage = 'Internal DB error';
  }
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

export interface GetUserResponseBody extends SuccessResponseBody {
  user: {
    name: string,
    email: string,
    registrationDate: string,
  },
}

export interface GetHabitsResponseBody extends SuccessResponseBody {
  habits: {
    id: string;
    name: string;
    creationDate: string;
    category: string;
    type: HabitType;
    archived: boolean;
  }[],
}

export interface GetHabitsForDateResponseBody extends SuccessResponseBody {
  habits: {
    id: string;
    name: string;
    creationDate: string;
    category: string;
    type: HabitType;
    state: HabitState;
    archived: boolean;
  }[],
}

export interface AddHabitResponseBody extends SuccessResponseBody {
  habit: {
    id: string;
    name: string;
    creationDate: string;
    category: string;
    type: HabitType;
    archived: boolean;
  },
}

export interface GetHabitResponseBody extends SuccessResponseBody {
  habit: {
    id: string;
    name: string;
    creationDate: string;
    category: string;
    type: HabitType;
    archived: boolean;
  },
}

export interface GetHabitHistoryResponseBody extends SuccessResponseBody {
  history: {
    id: string,
    date: string,
    type: HistoryEntryType,
  }[],
}

export interface GetCategoriesResponseBody extends SuccessResponseBody {
  categories: string[],
}

export interface GetGeneralStatsResponseBody extends SuccessResponseBody {
  stats: {
    activeHabitCount: number,
    archivedHabitCount: number,
    completedCount: number,
    completedPercentage: number,
  }
}

export interface GetHabitStatsResponseBody extends SuccessResponseBody {
  stats: {
    bestStreak: number,
    currentStreak: number,
    completedCount: number,
    completedPercentage: number,
  }
}
