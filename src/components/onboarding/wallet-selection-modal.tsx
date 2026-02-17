'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletReadyState, DecryptPermission, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';

interface WalletSelectionModalProps {
    open: boolean;
    onClose: () => void;
}

export function WalletSelectionModal({ open, onClose }: WalletSelectionModalProps) {
    const { wallets, select, connect, wallet } = useWallet();
    const [pendingWalletName, setPendingWalletName] = useState<string | null>(null);

    // Filter wallets to show installed ones first
    const sortedWallets = useMemo(() => {
        if (!wallets) return [];
        return [...wallets].sort((a, b) => {
            if (a.readyState === WalletReadyState.Installed && b.readyState !== WalletReadyState.Installed) return -1;
            if (a.readyState !== WalletReadyState.Installed && b.readyState === WalletReadyState.Installed) return 1;
            return 0;
        });
    }, [wallets]);

    // Handle connection only after selection is fully propagated
    useEffect(() => {
        const connectWallet = async () => {
            if (pendingWalletName && wallet && wallet.adapter.name === pendingWalletName) {
                try {
                    setPendingWalletName(null); // Reset pending state
                    await connect(DecryptPermission.UponRequest, WalletAdapterNetwork.TestnetBeta);
                    onClose();
                } catch (error) {
                    console.error('Failed to connect wallet:', error);
                    // Keep modal open on error
                }
            }
        };

        connectWallet();
    }, [wallet, pendingWalletName, connect, onClose]);

    if (!open) return null;

    const handleWalletClick = (event: React.MouseEvent, walletName: string) => {
        event.preventDefault();
        try {
            // Step 1: Select the wallet
            select(walletName as any);
            // Step 2: Set pending flag to trigger effect
            setPendingWalletName(walletName);
        } catch (error) {
            console.error('Failed to select wallet:', error);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="wallet-adapter-modal-wrapper bg-card border border-border rounded-2xl p-8 max-w-md w-full shadow-2xl relative">
                <button
                    className="wallet-adapter-modal-button-close absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={onClose}
                >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                        <path d="M14 12.461 8.3 6.772l5.234-5.233L12.006 0 6.772 5.234 1.54 0 0 1.539l5.234 5.233L0 12.006l1.539 1.528L6.772 8.3l5.69 5.7L14 12.461z"></path>
                    </svg>
                </button>

                <h1 className="wallet-adapter-modal-title font-headline text-2xl italic text-center mb-8 mt-2">
                    Connect an Aleo wallet
                </h1>

                <ul className="wallet-adapter-modal-list space-y-3">
                    {sortedWallets.map((wallet) => {
                        const isInstalled = wallet.readyState === WalletReadyState.Installed;

                        return (
                            <li key={wallet.adapter.name}>
                                <button
                                    className={`
                                        wallet-adapter-button w-full flex items-center justify-between p-4 rounded-xl 
                                        bg-background/50 hover:bg-primary/10 transition-all border border-border hover:border-primary/50
                                        ${!isInstalled && 'opacity-60'}
                                    `}
                                    tabIndex={0}
                                    type="button"
                                    onClick={(e) => isInstalled && handleWalletClick(e, wallet.adapter.name)}
                                >
                                    <div className="flex items-center gap-3">
                                        <i className="wallet-adapter-button-start-icon flex-shrink-0">
                                            <img
                                                src={wallet.adapter.icon}
                                                alt={`${wallet.adapter.name} icon`}
                                                className="w-10 h-10 rounded-full"
                                            />
                                        </i>
                                        <span className="font-semibold text-base">{wallet.adapter.name}</span>
                                    </div>
                                    {isInstalled && (
                                        <span className="text-xs bg-primary/20 text-primary px-3 py-1.5 rounded-full font-medium">
                                            Installed
                                        </span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>

                <button className="wallet-adapter-modal-list-more flex items-center justify-between w-full mt-4 py-2 px-1 text-sm text-gray-400 hover:text-white transition-colors">
                    <span>More options</span>
                    <svg width="13" height="7" viewBox="0 0 13 7" fill="currentColor">
                        <path d="M0.71418 1.626L5.83323 6.26188C5.91574 6.33657 6.0181 6.39652 6.13327 6.43762C6.24844 6.47872 6.37371 6.5 6.50048 6.5C6.62725 6.5 6.75252 6.47872 6.8677 6.43762C6.98287 6.39652 7.08523 6.33657 7.16774 6.26188L12.2868 1.626C12.7753 1.1835 12.3703 0.5 11.6195 0.5H1.37997C0.629216 0.5 0.224175 1.1835 0.71418 1.626Z"></path>
                    </svg>
                </button>

                <div className="wallet-adapter-modal-footer flexjustify-center mt-6 opacity-80 scale-90">
                    <a href="https://provable.com/" target="_blank" rel="noopener noreferrer" className="inline-block">
                        <svg width="115" height="18" viewBox="0 0 115 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g opacity="0.88">
                                <path d="M0 3.89265C0 2.29508 1.29508 1 2.89265 1H13.1073C14.7048 1 15.9999 2.29508 15.9999 3.89265V14.1074C15.9999 15.7049 14.7049 17 13.1073 17H10.4926C10.0937 17 9.7702 16.6766 9.7702 16.2776V8.67463C9.7702 7.87665 9.12331 7.22976 8.32533 7.22976H0.722439C0.323447 7.22976 0 6.90631 0 6.50732L0 3.89265Z" fill="white"></path>
                                <path d="M6.22973 12.2151C6.22973 11.4171 5.58284 10.7702 4.78485 10.7702H0.722439C0.323447 10.7702 0 11.0937 0 11.4927L0 14.1074C0 15.7049 1.29508 17 2.89265 17H5.50729C5.90628 17 6.22973 16.6766 6.22973 16.2776V12.2151Z" fill="white"></path>
                                <path d="M108.725 17.272C105.098 17.272 102.695 14.7107 102.695 10.88C102.695 7.04935 105.098 4.48802 108.725 4.48802C112.85 4.48802 115.275 7.52535 114.686 11.968H106.118C106.39 13.6453 107.319 14.5973 108.793 14.5973C110.039 14.5973 110.901 14.0533 111.263 13.056H114.663C114.006 15.7533 111.898 17.272 108.725 17.272ZM106.118 9.70135H111.467C111.195 8.04668 110.266 7.16268 108.793 7.16268C107.342 7.16268 106.413 8.06935 106.118 9.70135Z" fill="white"></path>
                                <path d="M98.3672 17V0.317363L101.699 0.0453644V17H98.3672Z" fill="white"></path>
                                <path d="M84.9072 17V0.317363L88.2392 0.0453644V6.50535H88.3752C89.1232 5.21336 90.3246 4.55602 92.0245 4.55602C95.2432 4.55602 97.3512 7.07202 97.3512 10.88C97.3512 14.688 95.2432 17.2267 92.0245 17.2267C90.3246 17.2267 89.1232 16.5693 88.3752 15.2547H88.2392V17H84.9072ZM91.0952 7.32135C89.3726 7.32135 88.2392 8.72668 88.2392 10.88C88.2392 13.056 89.3726 14.4613 91.0952 14.4613C92.8405 14.4613 93.9512 13.056 93.9512 10.88C93.9512 8.72668 92.8405 7.32135 91.0952 7.32135Z" fill="white"></path>
                                <path d="M76.3143 17.1813C73.9117 17.1813 72.3477 15.6853 72.3477 13.3733C72.3477 11.4013 73.685 10.1093 76.0423 9.83735L79.2836 9.47468C79.8956 9.38401 80.1903 9.11201 80.1903 8.61335C80.1903 7.68402 79.4876 7.11735 78.3543 7.11735C77.221 7.11735 76.4503 7.68402 76.3143 8.61335H72.8917C73.141 6.05202 75.249 4.48802 78.3996 4.48802C81.641 4.48802 83.5223 6.09735 83.5223 8.88535V17H80.1903V15.4133H80.0543C79.4423 16.456 77.9236 17.1813 76.3143 17.1813ZM77.4023 14.5973C78.8303 14.5973 80.1903 13.3507 80.1903 11.9V11.4693C80.0316 11.5827 79.8503 11.628 79.6236 11.6507L77.1983 11.9227C76.3143 12.0133 75.8157 12.4893 75.8157 13.2373C75.8157 14.076 76.4276 14.5973 77.4023 14.5973Z" fill="white"></path>
                                <path d="M64.509 17L60.1797 4.76003H63.5117L66.549 13.94H66.685L69.6997 4.76003H72.873L68.5437 17H64.509Z" fill="white"></path>
                                <path d="M54.3613 17.272C50.6666 17.272 48.1279 14.6653 48.1279 10.88C48.1279 7.09468 50.6666 4.48802 54.3613 4.48802C58.0559 4.48802 60.5946 7.09468 60.5946 10.88C60.5946 14.6653 58.0559 17.272 54.3613 17.272ZM54.3613 14.5067C56.1519 14.5067 57.2399 13.1467 57.2399 10.88C57.2399 8.61335 56.1519 7.25335 54.3613 7.25335C52.5706 7.25335 51.4826 8.61335 51.4826 10.88C51.4826 13.1467 52.5706 14.5067 54.3613 14.5067Z" fill="white"></path>
                                <path d="M40.0801 17V4.76002H43.4121V6.23335H43.5481C43.9561 5.10002 44.8401 4.48802 46.1094 4.48802H47.8094L48.0814 7.93335H45.6561C44.2054 7.93335 43.4121 8.56802 43.4121 9.74668V17H40.0801Z" fill="white"></path>
                                <path d="M26.3848 17V0.99736H33.0261C36.6981 0.99736 39.0554 3.08269 39.0554 6.34668C39.0554 9.63334 36.6981 11.764 33.0261 11.764H29.8754V17H26.3848ZM33.0261 8.72668C34.5674 8.72668 35.5647 7.82002 35.5647 6.41468C35.5647 5.00935 34.5674 4.10269 33.0261 4.10269H29.8754V8.72668H33.0261Z" fill="white"></path>
                            </g>
                        </svg>
                    </a>
                </div>
            </div>
        </div>
    );
}
