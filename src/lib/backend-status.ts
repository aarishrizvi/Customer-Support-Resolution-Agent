import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from './firebase';

// Firebase project ID from environment variable
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '';

export interface BackendReport {
  ok: boolean;
  issue: 'ok' | 'unreachable' | 'permission' | 'unknown';
  message: string;
  hint?: string;
  consoleUrl?: string;
  rulesUrl?: string;
  checkedAt: number;
}

/** Console link to create the missing Firestore database for this project. */
export const CREATE_DATABASE_URL = `https://console.cloud.google.com/datastore/setup?project=${projectId}`;
/** Console link to publish firestore.rules. */
export const RULES_CONSOLE_URL = `https://console.firebase.google.com/project/${projectId}/firestore/rules`;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

/**
 * Asks Firestore a question it must answer. A document that does not exist is
 * still a success (the database is alive); a thrown error is not.
 */
export async function probeBackend(timeoutMs = 8000): Promise<BackendReport> {
  const checkedAt = Date.now();
  try {
    await withTimeout(getDocFromServer(doc(db, 'test', 'connection')), timeoutMs);
    return { ok: true, issue: 'ok', message: 'Connected to Firestore.', checkedAt };
  } catch (err) {
    const code = String((err as { code?: string })?.code || '');
    const message = err instanceof Error ? err.message : String(err);
    const haystack = `${code} ${message}`.toLowerCase();

    if (haystack.includes('permission') || haystack.includes('denied')) {
      return {
        ok: false,
        issue: 'permission',
        message: 'Firestore security rules rejected the connection, so nothing can be saved or shared.',
        hint: 'Open firestore.rules in your project folder and publish it in the Firebase Console.',
        rulesUrl: RULES_CONSOLE_URL,
        checkedAt
      };
    }

    if (
      haystack.includes('offline') ||
      haystack.includes('unavailable') ||
      haystack.includes('not found') ||
      haystack.includes('not-found') ||
      haystack.includes('timed out')
    ) {
      return {
        ok: false,
        issue: 'unreachable',
        message: `Firestore backend for project ${projectId} cannot be reached. Google reports the (default) database does not exist - that is why messages never save and why a refresh wipes everything.`,
        hint: 'Create the database (Native mode) using the button below, then publish firestore.rules, then press Re-check.',
        consoleUrl: CREATE_DATABASE_URL,
        rulesUrl: RULES_CONSOLE_URL,
        checkedAt
      };
    }

    return {
      ok: false,
      issue: 'unknown',
      message: `Firestore check failed: ${message}`,
      hint: 'Open the browser console for the full error.',
      checkedAt
    };
  }
}

/** Turns raw Firestore/DOM errors into one sentence a person can act on. */
export function friendlyError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  if (lower.includes('permission') || lower.includes('denied')) {
    return 'Permission denied - firestore.rules is rejecting writes. Publish the rules file in the Firebase Console.';
  }
  if (lower.includes('does not exist')) {
    return 'The Firestore database does not exist yet, so nothing can be saved. Create it, then reload.';
  }
  if (lower.includes('offline') || lower.includes('unavailable') || lower.includes('network')) {
    return 'Cannot reach the backend. Check your connection and that the Firestore database exists for this project.';
  }
  if (lower.includes('unsupported field value') || lower.includes('undefined')) {
    return 'A data-shape error stopped the save. This is fixed in code - please try again.';
  }
  if (lower.includes('timed out') || lower.includes('timeout') || lower.includes('aborted')) {
    return 'The backend took too long to respond. Please try again.';
  }
  if (lower.includes('api key') || lower.includes('429') || lower.includes('503')) {
    return 'The AI service is busy or unavailable right now.';
  }
  return fallback;
}
