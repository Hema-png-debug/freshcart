/** Pragmatic email shape check (final validation happens server-side). */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}

export const MIN_PASSWORD_LENGTH = 8

export function passwordError(value: string): string | undefined {
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  return undefined
}
