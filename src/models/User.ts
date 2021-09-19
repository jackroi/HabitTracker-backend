import mongoose from 'mongoose';
import crypto = require('crypto');


/**
 * Given a plain text password, returns the digest of that password with the salt used in the encryption
 * @param pwd
 * @returns
 */
 function hashPassword(pwd: string): { digest: string, salt: string } {

  const salt = crypto.randomBytes(16).toString('hex'); // We use a random 16-bytes hex string for salt

  // We use the hash function sha512 to hash both the password and salt to
  // obtain a password digest
  //
  // From wikipedia: (https://en.wikipedia.org/wiki/HMAC)
  // In cryptography, an HMAC (sometimes disabbreviated as either keyed-hash message
  // authentication code or hash-based message authentication code) is a specific type
  // of message authentication code (MAC) involving a cryptographic hash function and
  // a secret cryptographic key.

  const hmac = crypto.createHmac('sha512', salt);
  hmac.update(pwd);
  const digest = hmac.digest('hex'); // The final digest depends both by the password and the salt

  return {
    digest: digest,
    salt: salt,
  };
}


export interface User {
  name: string;
  email: string;
  passwordDigest: string;
  salt: string;
  registrationDate: Date;
}


export interface UserDocument extends User, mongoose.Document {
  validatePassword: (pwd: string) => boolean;
}


// For model
export interface UserModel extends mongoose.Model<UserDocument> {
}


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


UserSchema.methods.validatePassword = function(this: UserDocument, pwd: string): boolean {
  // To validate the password, we compute the digest with the
  // same HMAC to check if it matches with the digest we stored
  // in the database.

  const hmac = crypto.createHmac('sha512', this.salt);
  hmac.update(pwd);
  const digest = hmac.digest('hex');
  return (this.passwordDigest === digest);
}


export function getSchema() {
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

  const { digest, salt } = hashPassword(data.password);

  const user: User = {
    name: data.name,
    email: data.email,
    passwordDigest: digest,
    salt: salt,
    registrationDate: new Date(),
  };

  return new userModel(user);
};
