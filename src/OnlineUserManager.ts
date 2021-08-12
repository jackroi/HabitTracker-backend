import { Socket } from 'socket.io';
import ClientEvents from './socketHandlers/eventTypes/ClientEvents';
import ServerEvents from './socketHandlers/eventTypes/ServerEvents';

type UserSocketsMap = {
  [key: string]: Socket<ClientEvents,ServerEvents>[];
};
type SocketIdUserMap = {
  [key: string]: string;
};


/**
 * Handle the non-persistent data of the application (i.e. players online, players in game, friend match
 * requests and random match requests)
 */
export class OnlineUserManager {

  // Map usernames -> sockets
  // A player is considered online if and only if his username is present in the keys of this map. In other words, he must have
  // at least one socket associated
  // A player can have multiple sockets associated (the same player is connected with multiple devices)
  private onlineUserSocketsMap: UserSocketsMap = {};
  // Map socketId -> username
  private socketIdOnlineUserMap: SocketIdUserMap = {};

  private static instance: OnlineUserManager | null;

  private constructor() { }

  /**
   * Returns the single TransientDataHandler instance
   * @returns
   */
  public static getInstance(): OnlineUserManager {
    if (!OnlineUserManager.instance) {
      OnlineUserManager.instance = new OnlineUserManager();
    }
    return OnlineUserManager.instance;
  }

  /**
   * Adds a socket of a certain user
   * @param email
   * @param socket
   * @returns
   */
  public addUserSocket(email: string, socket: Socket<ClientEvents,ServerEvents>): void {
    if (this.containsSocket(socket)) {
      return;
    }

    if (this.isOnline(email)) {
      this.onlineUserSocketsMap[email].push(socket);
    }
    else {
      this.onlineUserSocketsMap[email] = [socket];
    }

    this.socketIdOnlineUserMap[socket.id] = email;
  }

  /**
   * Removes a socket of a certain user
   * @param socket
   * @returns
   */
  public removeUserSocket(socket: Socket<ClientEvents,ServerEvents>): void {
    const email = this.getUserFromSocket(socket);
    if (!email) {
      return;
    }
    this.onlineUserSocketsMap[email] = this.onlineUserSocketsMap[email].filter(el => el.id !== socket.id);
    if (this.onlineUserSocketsMap[email].length === 0) {
      delete this.onlineUserSocketsMap[email];
    }
    delete this.socketIdOnlineUserMap[socket.id];
  }

  /**
   * Returns all the sockets of a certain user
   * @param email
   * @returns
   */
  public getSocketsFromUser(email: string): Socket<ClientEvents,ServerEvents>[] {
    return this.onlineUserSocketsMap[email] || [];
  }

  /**
   * Returns the user email of a certain socket
   * @param socket
   * @returns
   */
  public getUserFromSocket(socket: Socket<ClientEvents,ServerEvents>): string | undefined {
    return this.socketIdOnlineUserMap[socket.id];
  }

  /**
   * Checks if there is a certain socket
   * @param socket
   * @returns
   */
  public containsSocket(socket: Socket<ClientEvents,ServerEvents>): boolean {
    return socket.id in this.socketIdOnlineUserMap;
  }

  /**
   * Cheks if a user is online
   * @param email
   * @returns
   */
  public isOnline(email: string): boolean {
    return email in this.onlineUserSocketsMap
           && this.onlineUserSocketsMap[email].length > 0;
  }

}
