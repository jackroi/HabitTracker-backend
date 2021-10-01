// load .env into process.env
import dotenv = require('dotenv');
const result = dotenv.config()

if (result.error) {
  console.error('Unable to load \'.env\' file. Please provide one to store the JWT secret key');
  process.exit(-1);
}
if (!process.env.DB_HOST
  || !process.env.DB_PORT
  || !process.env.DB_NAME) {
  console.error('\'.env\' file loaded but doesn\'t contain some required key-value pairs');
  process.exit(-1);
}
if (!process.env.npm_package_version) {
  console.error('Missing environment variabile npm_package_version');
  process.exit(-1);
}


import mongoose from 'mongoose';
// add colorization to logs
import 'console-info';
import 'console-warn';
import 'console-error';

import * as user from './models/User';
// import { } from './User';
import * as habit from './models/Habit';
import { Habit, HabitDocument, HabitType } from './models/Habit';
import * as historyEntry from './models/HistoryEntry';
import { HistoryEntry, HistoryEntryType } from './models/HistoryEntry';


const {
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
} = process.env;

let databaseUrl;
if (!DB_USER || !DB_PASSWORD) {
  databaseUrl = `mongodb://${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}
else {
  databaseUrl = `mongodb+srv://${DB_USER}:${DB_PASSWORD}@${DB_HOST}/${DB_NAME}`;  // ?retryWrites=true&w=majority
}


mongoose.connect(databaseUrl, {
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
      type: HabitType.DAILY,
      archived: false,
      history: [],
      userEmail: testUserDocument.email,
    },
    {
      name: 'Run',
      creationDate: new Date(2021, 2, 5),
      category: 'Sport',
      type: HabitType.DAILY,
      archived: false,
      history: [],
      userEmail: testUserDocument.email,
    },
    {
      name: 'Read',
      creationDate: new Date(2021, 2, 7),
      category: 'Learning',
      type: HabitType.DAILY,
      archived: false,
      history: [],
      userEmail: testUserDocument.email,
    },
  ];
  const testUserHabitsDocuments = testUserHabits.map(el => {
    const habitModel = habit.getModel();
    return new habitModel(el);
  });
  return habit.getModel().insertMany(testUserHabitsDocuments);
})
.then((habitDocuments) => {
  console.info('Creating history entries for test user habits');

  const promises: Promise<HabitDocument>[] = [];
  for (let habitDocument of habitDocuments) {
    habitDocument.insertHistoryEntry({
      date: new Date(2021, 3, 1),
      type: HistoryEntryType.COMPLETED,
    });
    habitDocument.insertHistoryEntry({
      date: new Date(2021, 3, 2),
      type: HistoryEntryType.SKIPPED,
    });
    habitDocument.insertHistoryEntry({
      date: new Date(2021, 3, 3),
      type: HistoryEntryType.COMPLETED,
    });
    promises.push(habitDocument.save());
  }
  return Promise.all(promises);
})
.then(() => {
  return mongoose.connection.close();
})
.then(() => {
  console.info('Database correctly initialized');
})
.catch((err) => {
  console.error('Error occurred during initialization');
  console.error(err);
});
