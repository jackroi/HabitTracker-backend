/**
 * Events emitted from the server.
 */
export default interface ServerEvents {
  /**
   *
   * - habitCreated
   * - habitUpdated
   * - habitDeleted
   * - habitArchived
   * - habitUnarchived
   * - accountDeleted
   *
   * - categoriesUpdated
   *
   */




  /**
   * The Server notifies the Client sockets that one of his friend is now offline
   */
  'habitCreated': (habitId: string) => void;

  /**
   * The Server notifies the Client sockets that one of his friend is now online
   */
  'habitUpdated': (habitId: string) => void;

  /**
   * The Server notifies the Client sockets that one of his friend is now online
   */
  'habitHistoryUpdated': (habitId: string) => void;

  /**
   * The Server notifies the Client sockets that one of his friend is now in gamee
   */
  'habitDeleted': (habitId: string) => void;

  /**
   * The Server notifies the Client sockets that one of his friend is now off game
   */
  // 'habitArchived': (habitId: string) => void;

  /**
   * The Server notifies the Client sockets about a new friend request
   */
  // 'habitUnarchived': (habitId: string) => void;

  /**
   * The Server notifies the Client sockets about a new friend
   */
  'accountDeleted': () => void;
}
