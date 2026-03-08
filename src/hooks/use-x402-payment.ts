'use client';

import { useState, useCallback, useRef } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import {
  ARC20_CONFIG,
  usdToMicroToken,
  findPrivateTokenRecord,
  type TransactionOptions,
  type AleoRecord,
} from '@/lib/payment/payment-service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Where a micro-transaction currently sits in its lifecycle. */
export type X402Status =
  | 'idle'
  | 'finding-record'
  | 'awaiting-signature'
  | 'broadcasting'
  | 'confirming'
  | 'confirmed'
  | 'error';

export interface X402PaymentResult {
  transactionId: string;
  amountMicro: string;
}

export interface UseX402PaymentReturn {
  /** Current status of the payment lifecycle. */
  status: X402Status;
  /** Human-readable error when `status === 'error'`. */
  error: string | null;
  /** Result populated once `status === 'confirmed'`. */
  result: X402PaymentResult | null;
  /** Whether a transaction is in-flight (any state other than idle/error/confirmed). */
  isProcessing: boolean;
  /**
   * Trigger a private micro-payment.
   * @param actionCost  Cost in USD (e.g. 0.5 for $0.50 USDC).
   * @param memo        Optional human-readable label (not sent on-chain).
   * @returns The confirmed payment result, or throws on failure.
   */
  pay: (actionCost: number, memo?: string) => Promise<X402PaymentResult>;
  /** Reset the hook back to idle so the user can retry. */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_BLISS_TREASURY_ADDRESS!;
const MAX_POLL_ATTEMPTS = 60;
const POLL_INTERVAL_MS = 2_000;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * x402-style pay-per-use hook backed by private ARC-20 USDC transfers.
 *
 * Usage:
 * ```tsx
 * const { pay, status, error, isProcessing } = useX402Payment();
 * const handleSuperLike = async () => {
 *   try {
 *     await pay(0.5); // $0.50 micro-payment
 *     // action succeeds — grant the Super Like
 *   } catch {
 *     // UI already reflects the error via `status` / `error`
 *   }
 * };
 * ```
 */
export function useX402Payment(): UseX402PaymentReturn {
  const { executeTransaction, transactionStatus, requestRecords } = useWallet();

  const [status, setStatus] = useState<X402Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<X402PaymentResult | null>(null);

  // Guard against double-firing while a tx is already in flight.
  const inflightRef = useRef(false);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setResult(null);
    inflightRef.current = false;
  }, []);

  const pay = useCallback(
    async (actionCost: number, _memo?: string): Promise<X402PaymentResult> => {
      // ── Pre-flight checks ───────────────────────────────────────────
      if (inflightRef.current) {
        throw new Error('A payment is already in progress.');
      }
      if (!executeTransaction || !transactionStatus || !requestRecords) {
        throw new Error('Wallet not connected. Please connect your Shield Wallet first.');
      }
      if (actionCost <= 0) {
        throw new Error('Action cost must be greater than zero.');
      }

      inflightRef.current = true;
      setError(null);
      setResult(null);

      try {
        // ── 1. Resolve a private token record ───────────────────────
        setStatus('finding-record');

        const requiredMicro = usdToMicroToken(actionCost);

        const recordsAdapter = async (programId: string): Promise<AleoRecord[]> => {
          const recs = await requestRecords(programId);
          return recs as unknown as AleoRecord[];
        };

        const tokenRecord = await findPrivateTokenRecord(recordsAdapter, requiredMicro);

        // ── 2. Build & sign the private transfer ────────────────────
        setStatus('awaiting-signature');

        const txOptions: TransactionOptions = {
          program: ARC20_CONFIG.TOKEN_PROGRAM,
          function: 'transfer_private',
          inputs: [
            tokenRecord.plaintext,
            TREASURY_ADDRESS,
            `${requiredMicro.toString()}u64`,
          ],
          fee: ARC20_CONFIG.NETWORK_FEE,
          privateFee: true,
        };

        setStatus('broadcasting');
        const txResult = await executeTransaction(txOptions);
        if (!txResult) {
          throw new Error('Transaction was rejected by the wallet.');
        }
        const { transactionId } = txResult;

        // ── 3. Poll for on-chain confirmation ───────────────────────
        setStatus('confirming');

        let txStatus = 'pending';
        let attempts = 0;

        while (txStatus === 'pending') {
          if (++attempts > MAX_POLL_ATTEMPTS) {
            throw new Error(
              'Transaction confirmation timed out. ' +
              'Your payment may still be processing — please check the Aleo explorer.',
            );
          }
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
          const s = await transactionStatus(transactionId);
          txStatus = s.status.toLowerCase();

          if (txStatus === 'failed' || txStatus === 'rejected') {
            throw new Error(
              `Micro-payment transaction ${txStatus}. No funds were deducted.`,
            );
          }
        }

        // ── 4. Success ──────────────────────────────────────────────
        const paymentResult: X402PaymentResult = {
          transactionId,
          amountMicro: requiredMicro.toString(),
        };

        setResult(paymentResult);
        setStatus('confirmed');
        inflightRef.current = false;
        return paymentResult;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Private payment failed. Please try again.';
        setError(message);
        setStatus('error');
        inflightRef.current = false;
        throw err;
      }
    },
    [executeTransaction, transactionStatus, requestRecords],
  );

  const isProcessing =
    status === 'finding-record' ||
    status === 'awaiting-signature' ||
    status === 'broadcasting' ||
    status === 'confirming';

  return { status, error, result, isProcessing, pay, reset };
}
