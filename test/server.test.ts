
// load .env into process.env
import dotenv = require('dotenv');
const result = dotenv.config()

if (result.error) {
  console.error('Unable to load \'.env\' file. Please provide one to store the JWT secret key');
  process.exit(-1);
}
if (!process.env.JWT_SECRET
  || !process.env.DB_HOST
  || !process.env.DB_PORT
  || !process.env.DB_NAME) {
  console.error('\'.env\' file loaded but doesn\'t contain some required key-value pairs');
  process.exit(-1);
}
if (!process.env.npm_package_version) {
  console.error('Missing environment variabile npm_package_version');
  process.exit(-1);
}


import request from 'supertest';
import mongoose from 'mongoose';
import createApp from '../src/app';

import * as habit from '../src/models/Habit';
import * as user from '../src/models/User';
import { DateTime } from 'luxon';


const {
  DB_HOST,
  DB_PORT,
  DB_NAME,
} = process.env;

const VERSION = process.env.npm_package_version;


const app = createApp();


const testUser: user.NewUserParams = {
  name: 'Test',
  email: 'test@gmail.com',
  password: 'test',
};

let token: string;


beforeEach((done) => {
  mongoose.connect(`mongodb://${DB_HOST}:${DB_PORT}/${DB_NAME}-test`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: true,
  })
  .then(() => {
    request(app)
      .post(`/v${VERSION}/register`)
      .send(testUser)
      .end((err, res) => {
        token = res.body.token;
        done();
      });
  });

});

afterEach((done) => {
  mongoose.connection.db.dropDatabase()
    .then(() => mongoose.connection.close())
    .then(() => done());
});


describe('Root endpoints', () => {

  describe('GET /', () => {

    it('should return endpoint list', (done) => {
      request(app)
        .get(`/v${VERSION}`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then((response) => {
          expect(response.body.statusCode).toBe(response.statusCode);
          expect(response.body.error).toBe(false);
          expect(Array.isArray(response.body.endpoints)).toBeTruthy();

          done();
        })
        .catch(err => done(err));
    });

  });

});

describe('Authentication endpoints', () => {

  describe('POST /register', () => {

  });

});


describe('User endpoints', () => {

  describe('GET /user', () => {

  });

});

describe('Habit endpoints', () => {

  const habitList: habit.NewHabitParams[] = [
    {
      name: 'Run',
      category: 'Sport',
      type: habit.HabitType.DAILY,
      email: testUser.email,
    },
    {
      name: 'Read',
      category: 'Productivity',
      type: habit.HabitType.WEEKLY,
      email: testUser.email,
    },
  ];


  beforeEach(() => {
    const promises = [];
    for (let item of habitList) {
      promises.push(habit.newHabit(item).save());
    }
    return Promise.all(promises);
  });



  describe('GET /habits', () => {

    it('should return habit list without state if date param not specified', (done) => {
      request(app)
        .get(`/v${VERSION}/habits`)
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then((response) => {
          expect(response.body.statusCode).toBe(response.statusCode);
          expect(response.body.error).toBe(false);

          expect(Array.isArray(response.body.habits)).toBeTruthy();
          expect(response.body.habits.length).toBe(2);

          const habit0 = habitList[0];
          const expectedHabit0 = response.body.habits.find((el: any) => el.name === habit0.name);
          expect(expectedHabit0).toBeTruthy();
          expect(expectedHabit0.id).toBeTruthy();
          expect(expectedHabit0.name).toBe(habit0.name);
          expect(expectedHabit0.category).toBe(habit0.category);
          expect(expectedHabit0.type).toBe(habit0.type);
          expect(expectedHabit0.creationDate).toBeTruthy();
          expect(expectedHabit0.archived).toBe(false);
          expect(expectedHabit0.state).toBeUndefined();

          expect(response.body.habits.find((el: any) => el.name === habitList[1].name)).toBeTruthy();

          done();
        })
        .catch(err => done(err));
    });

    it('should return habit list with state if date param specified', (done) => {
      request(app)
        .get(`/v${VERSION}/habits`)
        .query({ date: DateTime.now().toISODate() })
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then((response) => {
          expect(response.body.statusCode).toBe(response.statusCode);
          expect(response.body.error).toBe(false);

          expect(Array.isArray(response.body.habits)).toBeTruthy();
          expect(response.body.habits.length).toBe(2);

          const habit0 = habitList[0];
          const expectedHabit0 = response.body.habits.find((el: any) => el.name === habit0.name);
          expect(expectedHabit0).toBeTruthy();
          expect(expectedHabit0.id).toBeTruthy();
          expect(expectedHabit0.name).toBe(habit0.name);
          expect(expectedHabit0.category).toBe(habit0.category);
          expect(expectedHabit0.type).toBe(habit0.type);
          expect(expectedHabit0.creationDate).toBeTruthy();
          expect(expectedHabit0.archived).toBe(false);
          expect(expectedHabit0.state).toBeTruthy();

          expect(response.body.habits.find((el: any) => el.name === habitList[1].name)).toBeTruthy();

          done();
        })
        .catch(err => done(err));
    });

  });


  describe('GET /habits/:id', () => {

    it('should return habit details', (done) => {
      const habit0 = habitList[0];
      habit.getModel().findOne({ name: habit0.name })
        .then((expectedHabit) => {
          request(app)
            .get(`/v${VERSION}/habits/${expectedHabit!.id}`)
            .set('Authorization', `Bearer ${token}`)
            .expect('Content-Type', /json/)
            .expect(200)
            .then((response) => {
              expect(response.body.statusCode).toBe(response.statusCode);
              expect(response.body.error).toBe(false);
              expect(response.body.habit).toBeTruthy();

              const returnedHabit = response.body.habit;
              expect(returnedHabit).toBeTruthy();
              expect(returnedHabit.id).toBe(expectedHabit!.id);
              expect(returnedHabit.name).toBe(expectedHabit!.name);
              expect(returnedHabit.category).toBe(expectedHabit!.category);
              expect(returnedHabit.type).toBe(expectedHabit!.type);
              expect(returnedHabit.creationDate).toBeTruthy();
              expect(returnedHabit.archived).toBe(false);

              done();
            })
            .catch(err => done(err));
        })

    });

    it('should return error 404', (done) => {
      const FAKE_ID = '999999999999';
      request(app)
        .get(`/v${VERSION}/habits/${FAKE_ID}`)
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(404)
        .then((response) => {
          expect(response.body.statusCode).toBe(response.statusCode);
          expect(response.body.error).toBe(true);
          expect(response.body.habit).toBeUndefined();

          done();
        })
        .catch(err => done(err));
    });

  });



  describe('PUT /habits/:id', () => {

    it('should archive habit', (done) => {
      const habit0 = habitList[0];
      habit.getModel().findOne({ name: habit0.name })
        .then((expectedHabit) => {
          request(app)
            .put(`/v${VERSION}/habits/${expectedHabit!.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
              archived: true,
            })
            .expect('Content-Type', /json/)
            .expect(200)
            .then((response) => {
              expect(response.body.statusCode).toBe(response.statusCode);
              expect(response.body.error).toBe(false);

              habit.getModel().findOne({ name: expectedHabit!.name, archived: true })
                .then((expectedArchivedHabit) => {
                  expect(expectedArchivedHabit).toBeTruthy();

                  expect(expectedHabit!.name).toBe(expectedArchivedHabit!.name);
                  expect(expectedHabit!.type).toBe(expectedArchivedHabit!.type);
                  expect(expectedHabit!.category).toBe(expectedArchivedHabit!.category);
                  expect(expectedHabit!.creationDate.toISOString()).toBe(expectedArchivedHabit!.creationDate.toISOString());

                  done();
                })

            })
            .catch(err => done(err));
        });

      });

    });


});
