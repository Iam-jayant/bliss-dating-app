'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Bell, Eye, Trash2, Download, Lock,
  AlertTriangle, ChevronRight, Globe, Moon, Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletMultiButton } from '@demox-labs/aleo-wallet-adapter-reactui';
import { useRouter } from 'next/navigation';
import { getProfile, exportProfileData } from '@/lib/storage/profile';

const SETTINGS_KEY = 'bliss_settings';

interface BlissSettings {
  notifications: {
    matches: boolean;
    messages: boolean;
    likes: boolean;
  };
  privacy: {
    showOnlineStatus: boolean;
    showDistance: boolean;
    readReceipts: boolean;
  };
  discovery: {
    enabled: boolean;
    maxDistance: number; // km
  };
  theme: 'light' | 'dark' | 'system';
}

const DEFAULT_SETTINGS: BlissSettings = {
  notifications: { matches: true, messages: true, likes: true },
  privacy: { showOnlineStatus: true, showDistance: true, readReceipts: true },
  discovery: { enabled: true, maxDistance: 50 },
  theme: 'system',
};

function loadSettings(): BlissSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: BlissSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export default function SettingsPage() {
  const { publicKey, disconnect } = useWallet();
  const router = useRouter();
  const [settings, setSettings] = useState<BlissSettings>(DEFAULT_SETTINGS);
  const [walletHash, setWalletHash] = useState('');

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    (async () => {
      if (publicKey) {
        const profile = await getProfile(publicKey);
        if (profile) setWalletHash(profile.wallet_hash);
      }
    })();
  }, [publicKey]);

  const updateSettings = (path: string, value: unknown) => {
    setSettings(prev => {
      const next = { ...prev };
      const keys = path.split('.');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let obj: any = next;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] };
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      saveSettings(next);
      return next;
    });
  };

  const handleExportData = async () => {
    if (!publicKey) return;
    const data = await exportProfileData(publicKey);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bliss-data-${walletHash.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAccount = async () => {
    if (!walletHash) return;
    
    // Remove profile
    const profiles = JSON.parse(localStorage.getItem('bliss_profiles_v2') || '{}');
    delete profiles[walletHash];
    localStorage.setItem('bliss_profiles_v2', JSON.stringify(profiles));
    
    // Remove related data
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes(walletHash) || key.startsWith('bliss_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    await disconnect();
    router.push('/');
  };

  if (!publicKey) {
    return (
      <div className="min-h-screen relative overflow-hidden pl-20 flex items-center justify-center p-4">
        <div className="fixed inset-0 -z-10 bg-background" />
        <Card className="max-w-md w-full p-8 text-center border border-primary/20 shadow-2xl backdrop-blur-sm bg-card/90">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-headline italic text-primary mb-3">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6 font-body">Connect your Aleo wallet to access settings</p>
          <WalletMultiButton className="!w-full !justify-center !py-3 !bg-primary hover:!bg-primary/90 !text-primary-foreground" />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden pl-20">
      <div className="fixed inset-0 -z-10 bg-background" />
      
      <div className="relative z-10 p-6 max-w-2xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-headline italic text-primary">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            All settings stored locally — never on servers
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="space-y-6">

          {/* Notifications */}
          <Card className="border border-primary/20 bg-card/90 backdrop-blur-sm p-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notif-matches" className="text-sm text-foreground">New Matches</Label>
                <Switch
                  id="notif-matches"
                  checked={settings.notifications.matches}
                  onCheckedChange={(v) => updateSettings('notifications.matches', v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="notif-messages" className="text-sm text-foreground">Messages</Label>
                <Switch
                  id="notif-messages"
                  checked={settings.notifications.messages}
                  onCheckedChange={(v) => updateSettings('notifications.messages', v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="notif-likes" className="text-sm text-foreground">Likes</Label>
                <Switch
                  id="notif-likes"
                  checked={settings.notifications.likes}
                  onCheckedChange={(v) => updateSettings('notifications.likes', v)}
                />
              </div>
            </div>
          </Card>

          {/* Privacy */}
          <Card className="border border-primary/20 bg-card/90 backdrop-blur-sm p-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-primary" />
              Privacy
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="priv-online" className="text-sm text-foreground">Show Online Status</Label>
                  <p className="text-xs text-muted-foreground">Let matches see when you&apos;re active</p>
                </div>
                <Switch
                  id="priv-online"
                  checked={settings.privacy.showOnlineStatus}
                  onCheckedChange={(v) => updateSettings('privacy.showOnlineStatus', v)}
                />
              </div>
              <Separator className="bg-primary/10" />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="priv-distance" className="text-sm text-foreground">Show Distance</Label>
                  <p className="text-xs text-muted-foreground">Display approximate distance on your profile</p>
                </div>
                <Switch
                  id="priv-distance"
                  checked={settings.privacy.showDistance}
                  onCheckedChange={(v) => updateSettings('privacy.showDistance', v)}
                />
              </div>
              <Separator className="bg-primary/10" />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="priv-read" className="text-sm text-foreground">Read Receipts</Label>
                  <p className="text-xs text-muted-foreground">Let others know you&apos;ve read their messages</p>
                </div>
                <Switch
                  id="priv-read"
                  checked={settings.privacy.readReceipts}
                  onCheckedChange={(v) => updateSettings('privacy.readReceipts', v)}
                />
              </div>
            </div>
          </Card>

          {/* Discovery */}
          <Card className="border border-primary/20 bg-card/90 backdrop-blur-sm p-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-primary" />
              Discovery
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="disc-enabled" className="text-sm text-foreground">Show Me in Discovery</Label>
                  <p className="text-xs text-muted-foreground">Turn off to hide your profile from others</p>
                </div>
                <Switch
                  id="disc-enabled"
                  checked={settings.discovery.enabled}
                  onCheckedChange={(v) => updateSettings('discovery.enabled', v)}
                />
              </div>
              <Separator className="bg-primary/10" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm text-foreground">Maximum Distance</Label>
                  <span className="text-sm font-medium text-primary">{settings.discovery.maxDistance} km</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="200"
                  step="5"
                  value={settings.discovery.maxDistance}
                  onChange={(e) => updateSettings('discovery.maxDistance', Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>5 km</span>
                  <span>200 km</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Account & Data */}
          <Card className="border border-primary/20 bg-card/90 backdrop-blur-sm p-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-primary" />
              Account &amp; Data
            </h2>
            <div className="space-y-3">
              {/* Wallet Info */}
              {walletHash && (
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Wallet Hash</p>
                  <p className="text-sm font-mono text-foreground truncate">{walletHash}</p>
                </div>
              )}

              {/* Export Data */}
              <Button
                variant="outline"
                className="w-full justify-between border-primary/20"
                onClick={handleExportData}
              >
                <span className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export My Data
                </span>
                <ChevronRight className="w-4 h-4" />
              </Button>

              {/* Blocked Users */}
              <Button
                variant="outline"
                className="w-full justify-between border-primary/20"
                onClick={() => {
                  const blocked = JSON.parse(localStorage.getItem('bliss_blocked_users') || '[]');
                  alert(blocked.length > 0 ? `You've blocked ${blocked.length} user(s).` : 'No blocked users.');
                }}
              >
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Blocked Users
                </span>
                <ChevronRight className="w-4 h-4" />
              </Button>

              <Separator className="bg-primary/10" />

              {/* Delete Account */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      Delete Account?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete your profile, matches, and messages from this device.
                      Data synced to the P2P network cannot be recalled. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete Everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </Card>

          {/* Version Info */}
          <div className="text-center text-xs text-muted-foreground py-4">
            <p>Bliss v1.0.0 • Built on Aleo</p>
            <p className="mt-1">Zero-knowledge dating • End-to-end encrypted</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
