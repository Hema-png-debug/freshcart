// jsdom polyfills needed by the app under test.
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// With `globals: false` testing-library cannot auto-register cleanup.
afterEach(cleanup)

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
