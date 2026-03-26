/**
 * Messages Page - End-to-end encrypted messaging for matched profiles
 * 
 * FIXES:
 * - Sender identity: uses wallet_hash consistently (not raw publicKey)
 * - Real-time: integrates Gun.js for P2P message delivery
 * - Proper read receipts
 * - End-to-end encrypted payloads with signed envelopes
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Lock, ArrowLeft, MoreVertical, Check, CheckCheck, Shield, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { getProfile, getProfileByHash, getProfileImageUrl } from '@/lib/storage/profile';
import { getMutualMatches } from '@/lib/matching/compatibility-service';
import { useSubscription } from '@/hooks/use-subscription';
import { SubscriptionModal } from '@/components/subscription/subscription-modal';
import {
  decryptMessageForViewer,
  encryptForParticipants,
  getPublicIdentity,
  signCanonicalPayload,
  verifyCanonicalPayload,
} from '@/lib/security/local-identity';
import {
  saveMessage,
  getChatMessages,
  markMessagesRead,
  subscribeToChat,
  type ChatMessage,
} from '@/lib/storage/gun-storage';

interface Chat {
  walletHash: string;
  name: string;
  imageCid: string;
  lastMessagePreview: string | undefined;
  lastMessageTime: number | undefined;
  unreadCount: number;
}

/** Resolve a profile image URL for display */
function getDisplayImage(imageCid: string, name: string): string {
  if (!imageCid) {
    return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=c0aede`;
  }
  if (imageCid.startsWith('local:') || imageCid.startsWith('data:')) {
    return getProfileImageUrl(imageCid);
  }
  return getProfileImageUrl(imageCid);
}

export default function MessagesPage() {
  const { address: publicKey } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatWith = searchParams.get('chat');
  const { tier, canChat, refresh: refreshSubscription } = useSubscription();
  
  const [myHash, setMyHash] = useState<string>('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(chatWith);
  const [messages, setMessages] = useState<Array<ChatMessage & { decryptedContent: string }>>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

  // Resolve my wallet hash once
  useEffect(() => {
    (async () => {
      if (publicKey) {
        const profile = await getProfile(publicKey);
        if (profile) setMyHash(profile.wallet_hash);
      }
    })();
  }, [publicKey]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const decryptMessage = useCallback(async (message: ChatMessage): Promise<string> => {
    if (message.signerWalletHash !== message.senderId) return '[Invalid sender binding]';
    if (message.timestamp > Date.now() + MAX_FUTURE_CLOCK_SKEW_MS) return '[Invalid timestamp]';

    const payload = {
      id: message.id,
      senderId: message.senderId,
      recipientId: message.recipientId,
      content: message.content,
      timestamp: message.timestamp,
      nonce: message.nonce,
      signerWalletHash: message.signerWalletHash,
      encrypted: message.encrypted,
      read: message.read,
      iv: message.iv,
      senderEncryptedKey: message.senderEncryptedKey,
      recipientEncryptedKey: message.recipientEncryptedKey,
    };

    const isSignatureValid = await verifyCanonicalPayload(
      message.signerPublicKey,
      payload,
      message.signature,
    );

    if (!isSignatureValid) return '[Invalid signature]';

    try {
      return await decryptMessageForViewer(myHash, message);
    } catch {
      return '[Unable to decrypt]';
    }
  }, [myHash]);

  // Load chats when hash is ready
  useEffect(() => {
    if (myHash) {
      loadChats();
    } else if (!publicKey) {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myHash]);

  // Load messages + subscribe to real-time updates
  useEffect(() => {
    if (selectedChat && myHash) {
      loadMessages(selectedChat);
      
      // Subscribe to real-time messages via Gun.js
      (async () => {
        // Unsubscribe from previous chat
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
        }
        const unsub = await subscribeToChat(myHash, selectedChat, async (newMsg) => {
          const decryptedContent = await decryptMessage(newMsg);
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, { ...newMsg, decryptedContent }].sort((a, b) => a.timestamp - b.timestamp);
          });
          setChats((prev) => prev.map((chat) => (
            chat.walletHash === selectedChat
              ? { ...chat, lastMessagePreview: decryptedContent, lastMessageTime: newMsg.timestamp }
              : chat
          )));
          scrollToBottom();
        });
        unsubscribeRef.current = unsub;
      })();
    }
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat, myHash, decryptMessage, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const loadChats = useCallback(async () => {
    if (!myHash) return;

    setLoading(true);
    try {
      const mutualMatchHashes = getMutualMatches(myHash);

      const chatList: Chat[] = (await Promise.all(
        mutualMatchHashes.map(async (walletHash: string) => {
          const matchProfile = await getProfileByHash(walletHash);
          if (!matchProfile) return null;

          const chatMessages = getChatMessages(myHash, walletHash);
          const lastMessage = chatMessages[chatMessages.length - 1];
          const unreadCount = chatMessages.filter((m) => m.recipientId === myHash && !m.read).length;

          return {
            walletHash,
            name: matchProfile.name,
            imageCid: matchProfile.profile_image_path || '',
            lastMessagePreview: lastMessage ? await decryptMessage(lastMessage) : undefined,
            lastMessageTime: lastMessage?.timestamp,
            unreadCount,
          } as Chat;
        }),
      )).filter((chat): chat is Chat => chat !== null);

      chatList.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
      setChats(chatList);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoading(false);
    }
  }, [decryptMessage, myHash]);

  const loadMessages = useCallback(async (recipientHash: string) => {
    if (!myHash) return;
    const encryptedMessages = getChatMessages(myHash, recipientHash);

    markMessagesRead(myHash, recipientHash, myHash);

    setChats((prev) => prev.map((chat) => (
      chat.walletHash === recipientHash ? { ...chat, unreadCount: 0 } : chat
    )));

    const decrypted = await Promise.all(
      encryptedMessages.map(async (message) => ({
        ...message,
        decryptedContent: await decryptMessage(message),
      })),
    );
    setMessages(decrypted);
  }, [decryptMessage, myHash]);

  const sendMessage = async () => {
    if (!myHash || !selectedChat || !messageInput.trim()) return;
    try {
      const plaintext = messageInput.trim();
      const recipientProfile = await getProfileByHash(selectedChat);
      const recipientPublicKey = recipientProfile?.messaging_public_key;
      if (!recipientPublicKey) {
        throw new Error('Recipient has no messaging key published');
      }

      await getPublicIdentity(myHash);
      const encrypted = await encryptForParticipants(myHash, recipientPublicKey, plaintext);

      const basePayload = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        senderId: myHash,
        recipientId: selectedChat,
        content: encrypted.content,
        timestamp: Date.now(),
        nonce: `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`,
        signerWalletHash: myHash,
        encrypted: true as const,
        read: false,
        iv: encrypted.iv,
        senderEncryptedKey: encrypted.senderEncryptedKey,
        recipientEncryptedKey: encrypted.recipientEncryptedKey,
      };

      const identity = await getPublicIdentity(myHash);
      const signature = await signCanonicalPayload(myHash, basePayload);
      const newMessage: ChatMessage = {
        ...basePayload,
        signerPublicKey: identity.signingPublicKey,
        signature,
      };

      await saveMessage(newMessage);

      setMessages((prev) => [
        ...prev,
        { ...newMessage, decryptedContent: plaintext },
      ]);
      setMessageInput('');

      setChats((prev) => prev.map((chat) => (
        chat.walletHash === selectedChat
          ? { ...chat, lastMessagePreview: plaintext, lastMessageTime: newMessage.timestamp }
          : chat
      )));
    } catch (error) {
      console.error('Failed to send encrypted message:', error);
    }
  };

  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // ─── LOADING STATE ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden pl-20 flex items-center justify-center">
        <div className="fixed inset-0 -z-10 bg-background" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // ─── NOT CONNECTED STATE ───────────────────────────────────────

  if (!publicKey) {
    return (
      <div className="min-h-screen relative overflow-hidden pl-20 flex items-center justify-center p-4">
        <div className="fixed inset-0 -z-10 bg-background" />
        <Card className="max-w-md w-full p-8 text-center border border-primary/20 shadow-2xl backdrop-blur-sm bg-card/90">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-headline italic text-primary mb-3">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6 font-body">
            Connect your Aleo wallet to access encrypted messaging
          </p>
          <WalletMultiButton className="!w-full !justify-center !py-3 !bg-primary hover:!bg-primary/90 !text-primary-foreground" />
        </Card>
      </div>
    );
  }

  const selectedChatData = chats.find(c => c.walletHash === selectedChat);

  const activeChatLimit = tier.limits.activeChats;
  const isOverChatLimit = (chatIndex: number) => {
    if (activeChatLimit === 0) return false;
    return chatIndex >= activeChatLimit;
  };

  const handleSelectChat = (walletHash: string, index: number) => {
    if (isOverChatLimit(index)) {
      setShowUpgradeModal(true);
      return;
    }
    setSelectedChat(walletHash);
  };

  // ─── MAIN MESSAGING UI ────────────────────────────────────────

  return (
    <div className="min-h-screen relative overflow-hidden pl-20 flex">
      <div className="fixed inset-0 -z-10 bg-background" />

      {/* Chat List Sidebar */}
      <div className="w-80 border-r border-primary/20 bg-card/80 backdrop-blur-xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-primary/20">
          <h2 className="text-2xl font-headline italic text-primary">Messages</h2>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Lock className="w-3 h-3" />
            End-to-end encrypted • P2P delivery
          </p>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-muted-foreground text-sm mb-4 font-body">No messages yet</p>
              <Button
                onClick={() => router.push('/matches')}
                variant="outline"
                size="sm"
                className="border-primary/20"
              >
                View Matches
              </Button>
            </div>
          ) : (
            chats.map((chat, index) => (
              <motion.button
                key={chat.walletHash}
                onClick={() => handleSelectChat(chat.walletHash, index)}
                whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                className={`w-full p-4 flex items-center gap-3 border-b border-primary/10 transition-colors ${
                  selectedChat === chat.walletHash ? 'bg-secondary' : ''
                } ${isOverChatLimit(index) ? 'opacity-50' : ''}`}
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={getDisplayImage(chat.imageCid, chat.name)} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {chat.name[0]}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-foreground truncate">{chat.name}</span>
                    {chat.lastMessageTime && (
                      <span className="text-xs text-muted-foreground">
                        {formatMessageTime(chat.lastMessageTime)}
                      </span>
                    )}
                  </div>
                  {chat.lastMessagePreview && (
                    <p className="text-sm text-muted-foreground truncate">
                      {chat.lastMessagePreview}
                    </p>
                  )}
                </div>

                {chat.unreadCount > 0 && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-xs text-primary-foreground font-bold">
                      {chat.unreadCount}
                    </span>
                  </div>
                )}
              </motion.button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat && selectedChatData ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-primary/20 bg-card/80 backdrop-blur-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedChat(null)}
                  className="lg:hidden"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                
                <Avatar className="w-10 h-10">
                  <AvatarImage src={getDisplayImage(selectedChatData.imageCid, selectedChatData.name)} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {selectedChatData.name[0]}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <h3 className="font-semibold text-foreground">{selectedChatData.name}</h3>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Encrypted • ZK Verified
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" title="Block user">
                  <Ban className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-sm font-body">
                    Send a message to start the conversation! 🎉
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" />
                    All messages are end-to-end encrypted
                  </p>
                </div>
              )}
              
              {messages.map((message) => {
                const isOwn = message.senderId === myHash;
                
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card shadow-sm border border-primary/20 text-foreground'
                      }`}
                    >
                      <p className="text-sm break-words">{message.decryptedContent}</p>
                      <div className={`flex items-center gap-1 mt-1 text-xs ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        <span>{formatMessageTime(message.timestamp)}</span>
                        {isOwn && (
                          message.read ? (
                            <CheckCheck className="w-3 h-3" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )
                        )}
                        {message.encrypted && <Lock className="w-3 h-3" />}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-primary/20 bg-card/80 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 border-primary/30 focus:border-primary"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!messageInput.trim()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Messages encrypted • Synced via P2P network
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-sm">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Send className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-headline italic text-primary mb-2">
                Select a conversation
              </h3>
              <p className="text-muted-foreground text-sm font-body">
                Choose a match from your list to start messaging
              </p>
            </div>
          </div>
        )}
      </div>

      <SubscriptionModal
        isOpen={showUpgradeModal}
        onClose={() => {
          setShowUpgradeModal(false);
          refreshSubscription();
        }}
      />
    </div>
  );
}
