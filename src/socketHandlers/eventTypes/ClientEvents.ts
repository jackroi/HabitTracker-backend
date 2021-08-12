/**
 * Events emitted from the clients.
 */
export default interface ClientEvents {
  /**
   *
   *
   *
   */


  /**
   * The Client socket notifies that he is online. He gives his JWT in order to be verified
   */
  'online': (jwtToken: string) => void;

  'offline': () => void;
}
