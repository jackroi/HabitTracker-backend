import mongoose from 'mongoose';

import { User, UserDocument, isUser } from './User';


export interface Habit {
  name: string;
  creationDate: Date;
  category: string;
  archived: boolean;

  // TODO valutare se è meglio sostituirlo con userEmail
  userId: mongoose.Schema.Types.ObjectId | User;    // TODO se rimane così rinominare in 'user'
}

interface HabitBaseDocument extends Habit, mongoose.Document {
}

export interface HabitDocument extends HabitBaseDocument {
  userId: UserDocument['_id'];
}

export interface HabitPopulatedDocument extends HabitBaseDocument {
  userId: UserDocument;
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
    && arg.userId
    && (arg.userId instanceof mongoose.Schema.Types.ObjectId || isUser(arg.userId));
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
  userId: {
    type: mongoose.SchemaTypes.ObjectId,
    required: true,
  },
});

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
