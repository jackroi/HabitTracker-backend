import mongoose from 'mongoose';

// TODO valutare se renderlo un type = 'COMPLETED' | 'SKIPPED'
// TODO o magari assegnare le relative stringhe (al posto degli int)
export enum HistoryEntryType {
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

export interface HistoryEntry {
  habitId: mongoose.Schema.Types.ObjectId;  // TODO valutare se rinominarlo in 'habit'
  date: Date;
  type: HistoryEntryType;
}

export interface HistoryEntryDocument extends HistoryEntry, mongoose.Document {
}

export interface HistoryEntryModel extends mongoose.Model<HistoryEntryDocument> {
}

// type guard
// TODO capire se serve
export const isHistoryEntry = (arg: any): arg is HistoryEntry => {
  return arg
    && arg.habitId
    && arg.habitId instanceof mongoose.Schema.Types.ObjectId
    && arg.date
    && arg.date instanceof Date
    && arg.type
    && (arg.type === HistoryEntryType.COMPLETED || arg.type === HistoryEntryType.SKIPPED);
};


const HistoryEntrySchema = new mongoose.Schema<HistoryEntryDocument, HistoryEntryModel>({
  habitId: {
    type: mongoose.SchemaTypes.ObjectId,
    required: true,
  },
  date: {
    type: mongoose.SchemaTypes.Date,
    required: true,
  },
  type: {
    type: mongoose.SchemaTypes.String,
    enum: [HistoryEntryType.COMPLETED, HistoryEntryType.SKIPPED],
    required: true,
  },
});


export const getSchema = () => {
  return HistoryEntrySchema;
};

let historyEntryModel: HistoryEntryModel;
export const getModel = (): HistoryEntryModel => {
  if (!historyEntryModel) {
    historyEntryModel = mongoose.model<HistoryEntryDocument, HistoryEntryModel>('HistoryEntry', getSchema());
  }
  return historyEntryModel;
}
