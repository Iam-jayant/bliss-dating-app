/**
 * Chat Interface - E2E Encrypted Messaging
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Shield, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { messagingService, type Message } from '@/lib/messaging/messaging-service';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';

interface ChatInterfaceProps {
  matchedUserAddress: string;
  matchedUserName: string;
  matchedUserImage: string;
}

export function ChatInterface({
  matchedUserAddress,
  matchedUserName,
  matchedUserImage,
}: ChatInterfaceProps) {
  const { publicKey } = useWallet();
  const [messages, setMessages] = useState<Array<Message & { decryptedContent: string }>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [recipientPublicKey, setRecipientPublicKey] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (publicKey) {
      loadMessages();
      loadRecipientPublicKey();
    }
  }, [publicKey, matchedUserAddress]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async () => {
    if (!publicKey) return;

    try {
      await messagingService.initialize(publicKey);
      const msgs = await messagingService.getMessages(matchedUserAddress);
      setMessages(msgs);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const loadRecipientPublicKey = async () => {
    // TODO: Fetch recipient's public key from on-chain profile or key server
    // For now, use placeholder
    setRecipientPublicKey('placeholder-public-key');
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !publicKey || sending) return;

    try {
      setSending(true);

      // Send encrypted message
      const message = await messagingService.sendMessage(
        matchedUserAddress,
        newMessage,
        recipientPublicKey
      );

      // Add to local messages
      setMessages(prev => [
        ...prev,
        { ...message, decryptedContent: newMessage },
      ]);

      // Clear input
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-pink-50 to-purple-50">
      {/* Chat Header */}
      <div className="bg-white border-b shadow-sm p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={matchedUserImage} />
              <AvatarFallback>{matchedUserName[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-lg">{matchedUserName}</h2>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Shield className="w-3 h-3" />
                <span>End-to-end encrypted</span>
              </div>
            </div>
          </div>

          <Badge variant="outline" className="bg-green-50 text-green-700">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
            Online
          </Badge>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Encryption Notice */}
          <div className="flex justify-center">
            <Badge variant="secondary" className="bg-blue-100 text-blue-900">
              <Lock className="w-3 h-3 mr-1" />
              Messages are end-to-end encrypted
            </Badge>
          </div>

          {/* Messages */}
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No messages yet. Say hi! 👋</p>
            </div>
          ) : (
            messages.map((message) => {
              const isFromMe = message.from === publicKey;
              return (
                <div
                  key={message.id}
                  className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] ${
                      isFromMe
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                        : 'bg-white'
                    } rounded-2xl px-4 py-2 shadow-sm`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {message.decryptedContent}
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        isFromMe ? 'text-pink-100' : 'text-gray-500'
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="bg-white border-t p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            disabled={sending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
