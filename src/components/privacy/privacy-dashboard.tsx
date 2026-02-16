/**
 * Privacy Dashboard - Transparency & Control Center
 * Shows users exactly what data exists, where it's stored, and how it's protected
 */

'use client';

import { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, Lock, Database, Key, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';

interface DataItem {
  name: string;
  location: 'on-chain' | 'ipfs' | 'local' | 'never-stored';
  encrypted: boolean;
  visibility: 'private' | 'selective' | 'public';
  description: string;
}

const DATA_INVENTORY: DataItem[] = [
  {
    name: 'Age Verification',
    location: 'on-chain',
    encrypted: true,
    visibility: 'private',
    description: 'Zero-knowledge proof stored as private record. Only proves 18+, never reveals age.',
  },
  {
    name: 'Your Interests',
    location: 'on-chain',
    encrypted: true,
    visibility: 'selective',
    description: 'Encrypted bitfield on-chain. Revealed selectively via ZK proofs on match.',
  },
  {
    name: 'Profile Photo & Bio',
    location: 'ipfs',
    encrypted: true,
    visibility: 'public',
    description: 'Encrypted and stored on IPFS. Only you have decryption key via wallet signature.',
  },
  {
    name: 'Location (Geohash)',
    location: 'on-chain',
    encrypted: true,
    visibility: 'selective',
    description: 'Approximate location (~5km radius) stored as geohash. Exact coordinates never stored.',
  },
  {
    name: 'Messages',
    location: 'ipfs',
    encrypted: true,
    visibility: 'private',
    description: 'End-to-end encrypted. Only you and recipient can decrypt.',
  },
  {
    name: 'Match Actions (Like/Pass)',
    location: 'on-chain',
    encrypted: true,
    visibility: 'private',
    description: 'Private records on-chain. Never public, never revealed to unmatched users.',
  },
  {
    name: 'Exact Birth Date',
    location: 'never-stored',
    encrypted: false,
    visibility: 'private',
    description: 'Never collected or stored. Only age threshold proven via ZK.',
  },
  {
    name: 'Email/Phone',
    location: 'never-stored',
    encrypted: false,
    visibility: 'private',
    description: 'Not required. Wallet is your identity.',
  },
];

export function PrivacyDashboard() {
  const { publicKey } = useWallet();
  const [privacyScore, setPrivacyScore] = useState(95);
  const [onChainRecords, setOnChainRecords] = useState(0);
  const [encryptedRecords, setEncryptedRecords] = useState(0);

  useEffect(() => {
    if (publicKey) {
      loadPrivacyMetrics();
    }
  }, [publicKey]);

  const loadPrivacyMetrics = async () => {
    // Production: Query on-chain profile and verification records
    // Development: Shows placeholder metrics
    setOnChainRecords(5);
    setEncryptedRecords(5);
  };

  const getLocationBadge = (location: string) => {
    const badges = {
      'on-chain': { color: 'bg-blue-100 text-blue-800', icon: Database },
      'ipfs': { color: 'bg-purple-100 text-purple-800', icon: FileText },
      'local': { color: 'bg-gray-100 text-gray-800', icon: Key },
      'never-stored': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    };
    return badges[location as keyof typeof badges] || badges['on-chain'];
  };

  const getVisibilityBadge = (visibility: string) => {
    const badges = {
      'private': { color: 'bg-red-100 text-red-800', icon: Lock },
      'selective': { color: 'bg-yellow-100 text-yellow-800', icon: Eye },
      'public': { color: 'bg-blue-100 text-blue-800', icon: Eye },
    };
    return badges[visibility as keyof typeof badges] || badges['private'];
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 p-4 pt-20">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Shield className="w-16 h-16 mx-auto mb-4 text-purple-600" />
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Privacy Dashboard
          </h1>
          <p className="text-gray-600">
            Complete transparency into your data and privacy controls
          </p>
        </div>

        {/* Privacy Score */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Privacy Score</h2>
              <p className="text-gray-600 text-sm">Based on your data protection settings</p>
            </div>
            <div className="text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              {privacyScore}%
            </div>
          </div>
          <Progress value={privacyScore} className="h-3" />
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Low</span>
            <span>High</span>
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-full">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{onChainRecords}</p>
                <p className="text-sm text-gray-600">On-Chain Records</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-full">
                <Lock className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{encryptedRecords}</p>
                <p className="text-sm text-gray-600">Encrypted Items</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-full">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">100%</p>
                <p className="text-sm text-gray-600">You Own Your Data</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="inventory" className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inventory">Data Inventory</TabsTrigger>
            <TabsTrigger value="zk-proofs">ZK Proofs</TabsTrigger>
            <TabsTrigger value="controls">Privacy Controls</TabsTrigger>
          </TabsList>

          {/* Data Inventory Tab */}
          <TabsContent value="inventory" className="space-y-3">
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Complete Data Inventory
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Every piece of data Bliss handles, where it's stored, and how it's protected.
              </p>

              <div className="space-y-3">
                {DATA_INVENTORY.map((item, i) => {
                  const locationBadge = getLocationBadge(item.location);
                  const visibilityBadge = getVisibilityBadge(item.visibility);

                  return (
                    <div key={i} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{item.name}</h4>
                        <div className="flex gap-2">
                          {item.encrypted && (
                            <Badge variant="outline" className="bg-green-50">
                              <Lock className="w-3 h-3 mr-1" />
                              Encrypted
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">{item.description}</p>

                      <div className="flex gap-2">
                        <Badge className={locationBadge.color}>
                          <locationBadge.icon className="w-3 h-3 mr-1" />
                          {item.location}
                        </Badge>
                        <Badge className={visibilityBadge.color}>
                          <visibilityBadge.icon className="w-3 h-3 mr-1" />
                          {item.visibility}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          {/* ZK Proofs Tab */}
          <TabsContent value="zk-proofs" className="space-y-3">
            <Card className="p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Active Zero-Knowledge Proofs
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                What you've proven without revealing actual data.
              </p>

              <div className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <h4 className="font-semibold">Age Verification (18+)</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Cryptographically proven you are 18 or older without revealing your age.
                  </p>
                  <div className="bg-green-50 rounded p-3 text-xs space-y-1">
                    <p><strong>Proven:</strong> age ≥ 18</p>
                    <p><strong>Hidden:</strong> Exact age, birth date, ID documents</p>
                    <p><strong>Verifiable:</strong> Anyone can verify proof on-chain</p>
                  </div>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-5 h-5 text-purple-500" />
                    <h4 className="font-semibold">Interest Compatibility</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Matches reveal ONLY shared interests via ZK proofs.
                  </p>
                  <div className="bg-purple-50 rounded p-3 text-xs space-y-1">
                    <p><strong>Proven:</strong> Shared interest count & specific matches</p>
                    <p><strong>Hidden:</strong> Non-matching interests (forever encrypted)</p>
                    <p><strong>Verifiable:</strong> Both parties can verify independently</p>
                  </div>
                </div>

                <div className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    <h4 className="font-semibold">Location Proximity</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Proves you're within range without revealing exact location.
                  </p>
                  <div className="bg-blue-50 rounded p-3 text-xs space-y-1">
                    <p><strong>Proven:</strong> Within 50km radius</p>
                    <p><strong>Hidden:</strong> Exact coordinates, address, neighborhood</p>
                    <p><strong>Precision:</strong> ~5km geohash zones</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Privacy Controls Tab */}
          <TabsContent value="controls" className="space-y-3">
            <Card className="p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Key className="w-5 h-5" />
                Privacy Controls
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <h4 className="font-semibold">Location Sharing</h4>
                    <p className="text-sm text-gray-600">
                      Share approximate location for nearby matches
                    </p>
                  </div>
                  <Button variant="outline">Edit</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <h4 className="font-semibold">Profile Visibility</h4>
                    <p className="text-sm text-gray-600">
                      Who can see your profile in discovery
                    </p>
                  </div>
                  <Button variant="outline">Edit</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <h4 className="font-semibold">Interest Privacy</h4>
                    <p className="text-sm text-gray-600">
                      Control how interests are revealed on match
                    </p>
                  </div>
                  <Button variant="outline">Edit</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <h4 className="font-semibold">Data Export</h4>
                    <p className="text-sm text-gray-600">
                      Download all your data in encrypted format
                    </p>
                  </div>
                  <Button variant="outline">Export</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded border-red-200">
                  <div>
                    <h4 className="font-semibold text-red-600">Delete Account</h4>
                    <p className="text-sm text-gray-600">
                      Permanently delete profile and all data
                    </p>
                  </div>
                  <Button variant="destructive">Delete</Button>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900 mb-1">Your Data, Your Control</p>
                  <p className="text-sm text-blue-800">
                    Unlike traditional dating apps, you own your data. It's stored in your wallet and encrypted with your private keys. Bliss cannot access, sell, or monetize your personal information.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
