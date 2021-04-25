import mongoose from 'mongoose';
import crypto = require('crypto');


export interface User {
  name: string;
  email: string;
  passwordDigest: string;
  salt: string;
  registrationDate: Date;
}



export interface UserDocument extends User, mongoose.Document {
  setPassword: (pwd: string) => void;
  validatePassword: (pwd: string) => boolean;
}


// For model
export interface UserModel extends mongoose.Model<UserDocument> {
}


// type guard
// TODO capire se serve
export const isUser = (arg: any): arg is User => {
  return arg
    && arg.name
    && typeof(arg.name) == 'string'
    && arg.email
    && typeof(arg.email) == 'string'
    && arg.passwordDigest
    && typeof(arg.passwordDigest) == 'string'
    && arg.salt
    && typeof(arg.salt) == 'string'
    && arg.registrationDate
    && arg.registrationDate instanceof Date
};

const UserSchema = new mongoose.Schema<UserDocument, UserModel>({
  name: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
  email: {
    type: mongoose.SchemaTypes.String,
    required: true,
    unique: true,
  },
  passwordDigest: {
    type: mongoose.SchemaTypes.String,
    required: false,
  },
  salt: {
    type: mongoose.SchemaTypes.String,
    required: false,
  },
  registrationDate: {
    type: mongoose.SchemaTypes.Date,
    required: true,
  },
});


// add some methods to the user Schema

const generateDigest = (pwd: string, salt: string): string => {
  const hmac = crypto.createHmac('sha512', salt);
  hmac.update(pwd);
  return hmac.digest('hex');
};

UserSchema.methods.setPassword = function(this: UserDocument, pwd: string): void {
  // TODO valutare uso di pbkdf2

  const SALT_LENGTH = 16;
  this.salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  this.passwordDigest = generateDigest(pwd, this.salt);
}

UserSchema.methods.validatePassword = function(this: UserDocument, pwd: string): boolean {
  // to validate the password, we compute the digest with the
  // same HMAC to check if it matches with the digest we stored
  // in the database.
  const digest = generateDigest(pwd, this.salt);

  return this.passwordDigest === digest;
}


export const getSchema = () => {    // TODO capire se serve davvero
  return UserSchema;
};

let userModel: UserModel;
export const getModel = (): UserModel => {
  if (!userModel) {
    userModel = mongoose.model<UserDocument, UserModel>('User', getSchema());
  }
  return userModel;
};


type NewUserParams = {
  name: string;
  email: string;
  password: string;
  registrationDate: Date;
}

export const newUser = (data: NewUserParams): UserDocument => {
  const userModel = getModel();

  // TODO capire se va bene passare anche password, dato che
  // TODO non è un campo di user
  const user = new userModel(data);
  user.setPassword(data.password);

  return user;
};
