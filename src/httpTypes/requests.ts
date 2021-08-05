// Interfaces for the HTTP requests

import { HabitType } from "../models/Habit";
import { HistoryEntryType } from "../models/HistoryEntry";

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

export interface AddHabitRequestBody extends RequestBody {
  name: string,
  category: string,
  type: HabitType,
}

// Type guard function
export function isAddHabitRequestBody(arg: any): arg is AddHabitRequestBody {
  return arg
    && arg.name           // It can't be the empty string
    && typeof (arg.name) === 'string'
    && arg.category       // It can't be the empty string
    && typeof (arg.category) === 'string'
    && arg.type           // It can't be the empty string
    && typeof (arg.type) === 'string'
    && (arg.type === HabitType.DAILY || arg.type === HabitType.WEEKLY || arg.type === HabitType.MONTHLY);
}

export interface UpdateHabitRequestBody extends RequestBody {
  name?: string,
  category?: string,
  archived?: boolean,
}

// Type guard function
export function isUpdateHabitRequestBody(arg: any): arg is UpdateHabitRequestBody {
  // The following checks that, if the property is defined, it must be of the right type
  return arg
    && (!arg.name || typeof (arg.name) === 'string')
    && (!arg.category || typeof (arg.category) === 'string')
    && ((arg.archived !== undefined && arg.archived !== null) || typeof (arg.archived) === 'boolean');
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

export interface AddHistoryEntryRequestBody extends RequestBody {
  date: string,
  type: HistoryEntryType,
}

// Type guard function
export function isAddHistoryEntryRequestBody(arg: any): arg is AddHistoryEntryRequestBody {
  return arg
    && arg.date           // It can't be the empty string
    && typeof (arg.date) === 'string'
    && arg.type           // It can't be the empty string
    && typeof (arg.type) === 'string'
    && (arg.type === HistoryEntryType.COMPLETED || arg.type === HistoryEntryType.SKIPPED);
}

export interface UpdateHistoryEntryRequestBody extends RequestBody {
  type: HistoryEntryType,
}

// Type guard function
export function isUpdateHistoryEntryRequestBody(arg: any): arg is UpdateHistoryEntryRequestBody {
  return arg
    && arg.type           // It can't be the empty string
    && typeof (arg.type) === 'string'
    && (arg.type === HistoryEntryType.COMPLETED || HistoryEntryType.SKIPPED);
}
