import mongoose from 'mongoose';

import { User, UserDocument } from './User';
import { HistoryEntry, HistoryEntrySchema } from './HistoryEntry';
import { DateTime, DurationObjectUnits } from 'luxon';


export enum HabitType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}


export enum HabitState {
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  NOT_COMPLETED = 'NOT_COMPLETED',
}


export interface Habit {
  name: string;
  creationDate: Date;
  category: string;
  type: HabitType;
  archived: boolean;

  history: HistoryEntry[];

  userEmail: string;
}

export interface HabitDocument extends Habit, mongoose.Document {
  insertHistoryEntry: (historyEntry: HistoryEntry) => void,
  deleteHistoryEntry: (date: Date) => void,
}

export interface HabitModel extends mongoose.Model<HabitDocument> {
}


const HabitSchema = new mongoose.Schema<HabitDocument, HabitModel>({
  name: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
  creationDate: {
    type: mongoose.SchemaTypes.Date,
    required: true,
  },
  category: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
  type: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
  archived: {
    type: mongoose.SchemaTypes.Boolean,
    required: true,
  },
  history: {
    type: [HistoryEntrySchema],
    required: true,
  },
  userEmail: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
});

// helper function
function sameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear()
    && d1.getMonth() === d2.getMonth()
    && d1.getDate() === d2.getDate();
}

HabitSchema.methods.insertHistoryEntry = function(historyEntry: HistoryEntry): void {
  // Note: this method is implemented in an unefficient way, a better implementation
  // could be done in the future, but for now the semplicity is preferred.
  // ! Warning: this implementation modifies the id of the history entry when an entry already exists with the same date

  // insert history entry into the array, keeping it sorted
  this.deleteHistoryEntry(historyEntry.date);                               // remove entry of the same period
  this.history.push(historyEntry);                                          // insert the new one
  this.history.sort((a, b) => a.date.getTime() - b.date.getTime());         // sort the array (older dates first, newer last)
  this.markModified('history');                                             // mark history as modified
}

HabitSchema.methods.deleteHistoryEntry = function(date: Date): void {
  let unit: keyof DurationObjectUnits;
  switch (this.type) {
    case HabitType.DAILY:
      unit = 'day';
      break;

    case HabitType.WEEKLY:
      unit = 'week';
      break;

    case HabitType.MONTHLY:
      unit = 'month';
      break;

    default:
      // Make sure all the HabitType cases are covered
      const _exhaustiveCheck: never = this.type;
      return _exhaustiveCheck;
  }

  // remove entry of the same period of the given date
  this.history = this.history.filter(item => {
    const currHistoryEntryDate = DateTime.fromISO(item.date.toISOString());
    const toDeleteDate = DateTime.fromISO(date.toISOString());
    return !currHistoryEntryDate.hasSame(toDeleteDate, unit);
  });
  this.markModified('history');                                             // mark history as modified
};

export const getSchema = () => {
  return HabitSchema;
};

let habitModel: HabitModel;
export const getModel = (): HabitModel => {
  if (!habitModel) {
    habitModel = mongoose.model('Habit', getSchema());
  }
  return habitModel;
};

export type NewHabitParams = {
  name: string;
  category: string;
  email: string;
  type: HabitType;
}

export const newHabit = (data: NewHabitParams): HabitDocument => {
  const habitModel = getModel();

  const habit: Habit = {
    name: data.name,
    category: data.category,
    creationDate: new Date(),
    type: data.type,
    archived: false,
    history: [],
    userEmail: data.email,
  };

  return new habitModel(habit);
};
