import { clsx, type ClassValue } from 'clsx';

/** Merge conditional class names. Single class utility for the web app. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
