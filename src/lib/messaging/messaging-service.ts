/**
 * Encrypted Messaging Service
 * Uses Web Crypto API for E2E encryption
 * Messages stored encrypted on decentralized infrastructure
 */

export interface Message {
  id: string;
  from: string; // wallet address
  to: string; // wallet address
  encryptedContent: string;
  timestamp: number;
  read: boolean;
}

export interface ChatThread {
  matchedWith: string; // wallet address
  partnerName: string;
  partnerImage: string;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount: number;
}

/**
 * Simple E2E Encryption using Web Crypto API
 * Production should use Signal Protocol or similar
 */
class MessageEncryption {
  private keyPair: CryptoKeyPair | null = null;

  async initialize() {
    // Generate or retrieve user's encryption key pair
    this.keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  async encryptMessage(message: string, recipientPublicKey: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      recipientPublicKey,
      data
    );

    // Convert to base64
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  }

  async decryptMessage(encryptedMessage: string): Promise<string> {
    if (!this.keyPair) await this.initialize();

    // Convert from base64
    const encrypted = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0));

    const decrypted = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      this.keyPair!.privateKey,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  async exportPublicKey(): Promise<string> {
    if (!this.keyPair) await this.initialize();

    const exported = await crypto.subtle.exportKey('spki', this.keyPair!.publicKey);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  }

  async importPublicKey(keyString: string): Promise<CryptoKey> {
    const keyData = Uint8Array.from(atob(keyString), c => c.charCodeAt(0));

    return await crypto.subtle.importKey(
      'spki',
      keyData,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['encrypt']
    );
  }
}

/**
 * Message Storage using IPFS + OrbitDB (decentralized database)
 * For MVP, can use Gun.js or XMTP protocol
 */
class MessageStorage {
  private messages: Map<string, Message[]> = new Map();

  async storeMessage(message: Message): Promise<void> {
    const threadKey = this.getThreadKey(message.from, message.to);
    const existingMessages = this.messages.get(threadKey) || [];
    this.messages.set(threadKey, [...existingMessages, message]);

    // TODO: Persist to decentralized storage (Gun.js, XMTP, or OrbitDB)
    // For now, just in-memory storage
  }

  async getMessages(user1: string, user2: string): Promise<Message[]> {
    const threadKey = this.getThreadKey(user1, user2);
    return this.messages.get(threadKey) || [];
  }

  async markAsRead(messageId: string, user1: string, user2: string): Promise<void> {
    const threadKey = this.getThreadKey(user1, user2);
    const messages = this.messages.get(threadKey) || [];
    const message = messages.find(m => m.id === messageId);
    if (message) {
      message.read = true;
    }
  }

  private getThreadKey(user1: string, user2: string): string {
    // Create deterministic thread key
    return [user1, user2].sort().join('_');
  }
}

/**
 * Main Messaging Service
 */
export class MessagingService {
  private encryption: MessageEncryption;
  private storage: MessageStorage;
  private currentUserAddress: string = '';

  constructor() {
    this.encryption = new MessageEncryption();
    this.storage = new MessageStorage();
  }

  async initialize(walletAddress: string) {
    this.currentUserAddress = walletAddress;
    await this.encryption.initialize();
  }

  /**
   * Send encrypted message
   */
  async sendMessage(
    recipientAddress: string,
    messageText: string,
    recipientPublicKey: string
  ): Promise<Message> {
    // Import recipient's public key
    const publicKey = await this.encryption.importPublicKey(recipientPublicKey);

    // Encrypt message
    const encryptedContent = await this.encryption.encryptMessage(messageText, publicKey);

    // Create message object
    const message: Message = {
      id: this.generateMessageId(),
      from: this.currentUserAddress,
      to: recipientAddress,
      encryptedContent,
      timestamp: Date.now(),
      read: false,
    };

    // Store message
    await this.storage.storeMessage(message);

    // TODO: Send via real-time channel (WebSocket, WebRTC, or XMTP)

    return message;
  }

  /**
   * Receive and decrypt messages
   */
  async getMessages(otherUserAddress: string): Promise<Array<Message & { decryptedContent: string }>> {
    const messages = await this.storage.getMessages(this.currentUserAddress, otherUserAddress);

    // Decrypt messages
    const decryptedMessages = await Promise.all(
      messages.map(async (msg) => {
        try {
          const decryptedContent = await this.encryption.decryptMessage(msg.encryptedContent);
          return { ...msg, decryptedContent };
        } catch (error) {
          console.error('Failed to decrypt message:', error);
          return { ...msg, decryptedContent: '[Encrypted]' };
        }
      })
    );

    return decryptedMessages;
  }

  /**
   * Get all chat threads
   */
  async getChatThreads(): Promise<ChatThread[]> {
    // TODO: Query on-chain mutual_matches to get list of matched users
    // For now, return empty array
    return [];
  }

  /**
   * Get public key for sharing
   */
  async getPublicKey(): Promise<string> {
    return await this.encryption.exportPublicKey();
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string, otherUserAddress: string): Promise<void> {
    await this.storage.markAsRead(messageId, this.currentUserAddress, otherUserAddress);
  }

  private generateMessageId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton
export const messagingService = new MessagingService();
