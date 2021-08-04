import mongoose from 'mongoose';

import { User, UserDocument, isUser } from './User';
import { HistoryEntry, HistoryEntrySchema } from './HistoryEntry';


export interface Habit {
  name: string;
  creationDate: Date;
  category: string;
  archived: boolean;

  // TODO valutare se ha senso che sia embedded
  history: HistoryEntry[];

  // TODO valutare se è meglio sostituirlo con userEmail
  userEmail: string | User;     // TODO se rimane così rinominare in 'user'
                                // TODO probabilmente togliere '|| User'
}

interface HabitBaseDocument extends Habit, mongoose.Document {
  insertHistoryEntry: (historyEntry: HistoryEntry) => void,
  deleteHistoryEntry: (date: Date) => void,
}

export interface HabitDocument extends HabitBaseDocument {
  userEmail: UserDocument['_id'];
}

export interface HabitPopulatedDocument extends HabitBaseDocument {
  userEmail: UserDocument;
}

export interface HabitModel extends mongoose.Model<HabitDocument> {
}


// type guard
export const isHabit = (arg: any): arg is Habit => {
  return arg
    && arg.name
    && typeof(arg.name) == 'string'
    && arg.creationDate
    && arg.creationDate instanceof Date
    && arg.category
    && typeof(arg.category) == 'string'
    && arg.archived
    && typeof(arg.archived) == 'boolean'
    && arg.userEmail
    && (typeof(arg.category) == 'string' || isUser(arg.userEmail));
};


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
  // TODO eventualmente implementazione più efficiente
  // ! attenzione, questa implementazione modifica id entry
  // insert history entry into the array, keeping it sorted
  this.deleteHistoryEntry(historyEntry.date);                               // remove entry of the same day
  this.history.push(historyEntry);                                          // insert the new one
  this.history.sort((a, b) => a.date.getTime() - b.date.getTime());         // sort the array (older dates first, newer last)
  this.markModified('history');                                             // mark history as modified
}

HabitSchema.methods.deleteHistoryEntry = function(date: Date): void {
  this.history = this.history.filter(item => !sameDay(item.date, date));    // remove entry of the given date
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

type NewHabitParams = {
  name: string;
  category: string;
  email: string;
}

export const newHabit = (data: NewHabitParams): HabitDocument => {
  const habitModel = getModel();

  const habit: Habit = {
    name: data.name,
    category: data.category,
    creationDate: new Date(),
    archived: false,
    history: [],
    userEmail: data.email,
  };

  return new habitModel(habit);
};
