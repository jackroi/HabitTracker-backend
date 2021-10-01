/**
 *
 *
 */

console.info('Server starting...');

// load .env into process.env
import dotenv = require('dotenv');
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  const result = dotenv.config()

  if (result.error) {
    console.error('Unable to load \'.env\' file. Please provide one to store the JWT secret key');
    process.exit(-1);
  }
  if (!process.env.JWT_SECRET
    || !process.env.DB_HOST
    || !process.env.DB_PORT
    || !process.env.DB_NAME
    || !process.env.SERVER_PORT) {
    console.error('\'.env\' file loaded but doesn\'t contain some required key-value pairs');
    process.exit(-1);
  }
}
if (!process.env.npm_package_version) {
  console.error('Missing environment variabile npm_package_version');
  process.exit(-1);
}


import express, { Request, Response, NextFunction } from 'express';
import http from 'http';                      // HTTP module
import mongoose from 'mongoose';
// add colorization to logs
import 'console-info';
import 'console-warn';
import 'console-error';

import createApp from './app';
import { getSocketIO, initializeSocketIO } from './initializeSocketIO';
import registerOnlineUserHandlers from './socketHandlers/onlineUserHandlers';



// Connect to mongodb and launch the HTTP server trough Express

const {
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  SERVER_PORT,
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
  useFindAndModify: true,
})
.then(() => {
  console.info('Connected to MongoDB');
})
.then(() => {
  const app = createApp();
  const server = http.createServer(app);

  // Initialize socketIO
  initializeSocketIO(server);
  // socketIO instance
  const io = getSocketIO();

  // For each socket that connects to the Server, register all the socketIO events.
  io.on('connection', (socket) => {
    console.info('Socket.io client connected');

    registerOnlineUserHandlers(io, socket);
  });

  const port = process.env.PORT || SERVER_PORT;
  server.listen(port, () => console.info(`HTTP Server started on port ${port}`));
})
.catch((err) => {
  console.error('Error occurred during initialization');
  console.error(err);
});
