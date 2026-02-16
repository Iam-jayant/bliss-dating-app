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
 * Message Storage using Gun.js P2P Network
 * Real-time, decentralized, and privacy-preserving
 */
class MessageStorage {
  private gun: any = null;
  private messageListeners: Map<string, Function> = new Map();

  async initialize() {
    if (typeof window === 'undefined') return;
    
    try {
      const Gun = (await import('gun')).default;
      this.gun = Gun({
        peers: [
          'https://gun-manhattan.herokuapp.com/gun',
          'https://gun-us.herokuapp.com/gun',
        ],
        localStorage: true
      });
      console.log('🔫 Gun.js messaging initialized');
    } catch (err) {
      console.warn('Gun.js init failed:', err);
    }
  }

  async storeMessage(message: Message): Promise<void> {
    const threadKey = this.getThreadKey(message.from, message.to);
    
    // Store in Gun.js for real-time sync
    if (this.gun) {
      try {
        await this.gun
          .get('bliss_chats')
          .get(threadKey)
          .get('messages')
          .get(message.id)
          .put({
            id: message.id,
            from: message.from,
            to: message.to,
            encryptedContent: message.encryptedContent,
            timestamp: message.timestamp,
            read: message.read
          });
      } catch (err) {
        console.error('Gun.js message store error:', err);
      }
    }
    
    // Also cache locally for offline access
    const localKey = `bliss_chat_${threadKey}`;
    const cached = JSON.parse(localStorage.getItem(localKey) || '[]');
    cached.push(message);
    localStorage.setItem(localKey, JSON.stringify(cached.slice(-100))); // Keep last 100
  }

  async getMessages(user1: string, user2: string): Promise<Message[]> {
    const threadKey = this.getThreadKey(user1, user2);
    const localKey = `bliss_chat_${threadKey}`;
    
    // First, return cached messages for instant loading
    const cached = JSON.parse(localStorage.getItem(localKey) || '[]');
    
    // Then sync with Gun.js in background
    if (this.gun) {
      try {
        const messages: Message[] = [];
        await new Promise<void>((resolve) => {
          this.gun
            .get('bliss_chats')
            .get(threadKey)
            .get('messages')
            .once((data: any) => {
              if (data) {
                Object.values(data).forEach((msg: any) => {
                  if (msg && typeof msg === 'object' && msg.id) {
                    messages.push(msg as Message);
                  }
                });
              }
              resolve();
            });
          // Timeout after 2s
          setTimeout(resolve, 2000);
        });
        
        if (messages.length > 0) {
          // Update cache
          localStorage.setItem(localKey, JSON.stringify(messages));
          return messages.sort((a, b) => a.timestamp - b.timestamp);
        }
      } catch (err) {
        console.warn('Gun.js message fetch error:', err);
      }
    }
    
    return cached;
  }

  /**
   * Subscribe to real-time message updates
   */
  subscribeToMessages(user1: string, user2: string, callback: (message: Message) => void): () => void {
    const threadKey = this.getThreadKey(user1, user2);
    
    if (this.gun) {
      this.gun
        .get('bliss_chats')
        .get(threadKey)
        .get('messages')
        .on((data: any, key: string) => {
          if (data && typeof data === 'object' && data.id && key !== '_') {
            callback(data as Message);
          }
        });
    }
    
    // Return unsubscribe function
    return () => {
      if (this.gun) {
        this.gun
          .get('bliss_chats')
          .get(threadKey)
          .get('messages')
          .off();
      }
    };
  }

  async markAsRead(messageId: string, user1: string, user2: string): Promise<void> {
    const threadKey = this.getThreadKey(user1, user2);
    
    if (this.gun) {
      this.gun
        .get('bliss_chats')
        .get(threadKey)
        .get('messages')
        .get(messageId)
        .get('read')
        .put(true);
    }
    
    // Update local cache
    const localKey = `bliss_chat_${threadKey}`;
    const cached = JSON.parse(localStorage.getItem(localKey) || '[]');
    const message = cached.find((m: Message) => m.id === messageId);
    if (message) {
      message.read = true;
      localStorage.setItem(localKey, JSON.stringify(cached));
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
    await this.storage.initialize();
  }

  /**
   * Subscribe to real-time messages
   */
  subscribeToMessages(recipientAddress: string, callback: (message: Message) => void): () => void {
    return this.storage.subscribeToMessages(this.currentUserAddress, recipientAddress, callback);
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

    // Production: Send via real-time channel (WebSocket, WebRTC, or XMTP)
    // Development: Messages stored in memory

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
    // Production: Query on-chain mutual_matches mapping for matched users
    // Development: Returns empty array (use blissMatching.listAllMatches() in console)
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
