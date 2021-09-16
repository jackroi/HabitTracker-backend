import mongoose from 'mongoose';


export enum HistoryEntryType {
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

export interface HistoryEntry {
  date: Date;
  type: HistoryEntryType;
}

export interface HistoryEntryDocument extends HistoryEntry, mongoose.Document {
}


export const HistoryEntrySchema = new mongoose.Schema({
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
