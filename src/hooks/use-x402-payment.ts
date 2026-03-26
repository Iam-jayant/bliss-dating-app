'use client';

import { useCallback, useRef, useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

export type X402Status =
  | 'idle'
  | 'awaiting-signature'
  | 'broadcasting'
  | 'confirming'
  | 'confirmed'
  | 'error';

export interface X402PaymentResult {
  transactionId: string;
  amountMicrocredits: string;
}

export interface UseX402PaymentReturn {
  status: X402Status;
  error: string | null;
  result: X402PaymentResult | null;
  isProcessing: boolean;
  pay: (actionCostCredits: number, memo?: string) => Promise<X402PaymentResult>;
  reset: () => void;
}

const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_BLISS_TREASURY_ADDRESS || '';
const NETWORK_FEE = Number(process.env.NEXT_PUBLIC_ALEO_FEE_MICROCREDITS || 1_000_000);
const MAX_POLL_ATTEMPTS = 60;
const POLL_INTERVAL_MS = 2_000;
const MICROCREDITS_PER_CREDIT = 1_000_000;

function toMicrocredits(credits: number): bigint {
  return BigInt(Math.round(credits * MICROCREDITS_PER_CREDIT));
}

export function useX402Payment(): UseX402PaymentReturn {
  const { executeTransaction, transactionStatus } = useWallet();

  const [status, setStatus] = useState<X402Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<X402PaymentResult | null>(null);
  const inflightRef = useRef(false);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setResult(null);
    inflightRef.current = false;
  }, []);

  const pay = useCallback(
    async (actionCostCredits: number, _memo?: string): Promise<X402PaymentResult> => {
      if (inflightRef.current) {
        throw new Error('A payment is already in progress.');
      }
      if (!executeTransaction || !transactionStatus) {
        throw new Error('Wallet not connected. Please connect your Aleo wallet.');
      }
      if (!TREASURY_ADDRESS) {
        throw new Error('Treasury address is not configured.');
      }
      if (actionCostCredits <= 0) {
        throw new Error('Action cost must be greater than zero.');
      }

      inflightRef.current = true;
      setError(null);
      setResult(null);

      try {
        const amountMicrocredits = toMicrocredits(actionCostCredits);

        setStatus('awaiting-signature');

        setStatus('broadcasting');
        const txResult = await executeTransaction({
          program: 'credits.aleo',
          function: 'transfer_private',
          inputs: [TREASURY_ADDRESS, `${amountMicrocredits.toString()}u64`],
          fee: NETWORK_FEE,
          privateFee: true,
        });

        if (!txResult?.transactionId) {
          throw new Error('Transaction was rejected by the wallet.');
        }

        const transactionId = txResult.transactionId;
        setStatus('confirming');

        let attempts = 0;
        let txState = 'pending';

        while (txState === 'pending') {
          if (++attempts > MAX_POLL_ATTEMPTS) {
            throw new Error('Transaction confirmation timed out. Check the Aleo explorer and retry.');
          }

          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
          const statusResult = await transactionStatus(transactionId);
          txState = String(statusResult.status || 'pending').toLowerCase();

          if (txState === 'failed' || txState === 'rejected') {
            throw new Error(`Micro-payment transaction ${txState}.`);
          }
        }

        const paymentResult: X402PaymentResult = {
          transactionId,
          amountMicrocredits: amountMicrocredits.toString(),
        };

        setResult(paymentResult);
        setStatus('confirmed');
        inflightRef.current = false;
        return paymentResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Private payment failed. Please try again.';
        setError(message);
        setStatus('error');
        inflightRef.current = false;
        throw err;
      }
    },
    [executeTransaction, transactionStatus],
  );

  const isProcessing =
    status === 'awaiting-signature' ||
    status === 'broadcasting' ||
    status === 'confirming';

  return { status, error, result, isProcessing, pay, reset };
}
