import mongoose from 'mongoose';
// add colorization to logs
import 'console-info';
import 'console-warn';
import 'console-error';

import * as user from './models/User';
// import { } from './User';
import * as habit from './models/Habit';
import { Habit } from './models/Habit';
import * as historyEntry from './models/HistoryEntry';
import { HistoryEntry, HistoryEntryType } from './models/HistoryEntry';


// TODO maybe put db name and other inside .env
const DB_URL = 'mongodb://habit-tracker-db:27017/habittracker';


mongoose.connect(DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
})
.then(() => {
  console.info('Connected to MongoDB');
})
.then(() => {
  console.info('Dropping database');

  return mongoose.connection.db.dropDatabase();
})
.then(() => {
  console.info('Creating test user');

  const testUser = {
    name: 'test',
    email: 'test@gmail.com',
    password: 'test',
    registrationDate: new Date(2021, 0, 10),
  };
  const testUserDocument = user.newUser(testUser);
  return testUserDocument.save();
})
.then((testUserDocument) => {
  console.info('Creating habits for test user');

  const testUserHabits: Habit[] = [
    {
      name: 'Study',
      creationDate: new Date(2021, 1, 2),
      category: 'Learning',
      archived: false,
      userEmail: testUserDocument.email,
    },
    {
      name: 'Run',
      creationDate: new Date(2021, 2, 5),
      category: 'Sport',
      archived: false,
      userEmail: testUserDocument.email,
    },
    {
      name: 'Read',
      creationDate: new Date(2021, 2, 7),
      category: 'Learning',
      archived: false,
      userEmail: testUserDocument.email,
    },
  ];
  return habit.getModel().insertMany(testUserHabits);
}).then((habitDocuments) => {
  console.info('Creating history entries for test user habits');

  const historyEntries: HistoryEntry[] = [];
  for (let habitDocument of habitDocuments) {
    historyEntries.push({
      habitId: habitDocument._id,
      date: new Date(2021, 3, 1),
      type: HistoryEntryType.COMPLETED,
    });
    historyEntries.push({
      habitId: habitDocument._id,
      date: new Date(2021, 3, 2),
      type: HistoryEntryType.SKIPPED,
    });
    historyEntries.push({
      habitId: habitDocument._id,
      date: new Date(2021, 3, 3),
      type: HistoryEntryType.COMPLETED,
    });
  }
  return historyEntry.getModel().insertMany(historyEntries);
}).then(() => {
  return mongoose.connection.close();
})
.then(() => {
  console.info('Database correctly initialized');
})
.catch((err) => {
  console.error('Error occurred during initialization');
  console.error(err);
});
