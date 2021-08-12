import { Server, Socket } from 'socket.io';
import jsonwebtoken = require('jsonwebtoken');    // JWT generation

import ClientEvents from './eventTypes/ClientEvents';
import ServerEvents from './eventTypes/ServerEvents';
import { OnlineUserManager } from "../OnlineUserManager";

// TODO valutare se importarla da qualche parte
interface TokenData {
  name: string;
  email: string;
}

/**
 * Registers to the specified Client socket the handlers about the online/offline managment
 * @param io
 * @param socket
 */
export default function (io: Server<ClientEvents, ServerEvents>, socket: Socket<ClientEvents, ServerEvents>) {

  const onlineUserHandler = OnlineUserManager.getInstance();

  // Handler of the online event
  socket.on('online', (jwtToken) => {
    console.info('Socket event: "online"');

    try {
      // Verify the token given by the Client
      const playerToken: TokenData = jsonwebtoken.verify(jwtToken, process.env.JWT_SECRET as string) as TokenData;
      const email = playerToken.email;

      onlineUserHandler.isOnline(email);

      // Add the verified socket
      onlineUserHandler.addUserSocket(email, socket);

    }
    catch (err) {
      console.warn('A socket sent an invalid JWT token');
    }
  });

  // Handler of the socket diconnection
  socket.on('offline', async () => {
    console.info('Socket event: "offline"');

    const email = onlineUserHandler.getUserFromSocket(socket);
    if (!email) {          // Not registered socket, probably the user is offline
      return;
    }

    // Remove the disconnected socket
    onlineUserHandler.removeUserSocket(socket);
  });

  // Handler of the socket diconnection
  socket.on('disconnect', async () => {
    console.info('Socket event: "disconnect"');

    const email = onlineUserHandler.getUserFromSocket(socket);
    if (!email) {          // Not registered socket, probably the user is offline
      return;
    }

    // Remove the disconnected socket
    onlineUserHandler.removeUserSocket(socket);
  });
}
