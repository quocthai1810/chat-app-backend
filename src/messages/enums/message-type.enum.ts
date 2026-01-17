/**
 * Message Type Enum
 * Defines the types of messages supported in the chat application
 */
export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',      // PDF, Word, Excel, etc.
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  SYSTEM = 'SYSTEM',  // System messages (user joined, left, etc.)
}
