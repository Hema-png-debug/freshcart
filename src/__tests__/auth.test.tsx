/** Auth, guards, and app shell (Phase 1) — split from app.smoke.test.tsx. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/supabase', async () => (await import('./helpers/state')).supabaseMockModule())
vi.mock('../lib/payments/stripeProvider', async () =>
  (await import('./helpers/state')).stripeMockModule())

import { mockState, fakeSession, signInWithPassword, signOutMock } from './helpers/state'
import { renderApp, resetTestState } from './helpers/render'

beforeEach(resetTestState)

describe('configuration guard', () => {
  it('shows the setup notice when Supabase is not configured', () => {
    mockState.configured = false
    renderApp('/')
    expect(screen.getByText(/connect your supabase project/i)).toBeTruthy()
  })
})

describe('auth guards', () => {
  it('redirects signed-out users away from protected tabs to Welcome', async () => {
    renderApp('/home')
    expect(await screen.findByText(/minutes away/i)).toBeTruthy()
  })

  it('redirects signed-in users away from auth pages into the app', async () => {
    mockState.session = fakeSession
    renderApp('/login')
    expect(await screen.findByText(/what's on the list today/i)).toBeTruthy()
  })
})

describe('login flow', () => {
  it('validates fields before calling Supabase', async () => {
    const user = userEvent.setup()
    renderApp('/login')
    await user.click(await screen.findByRole('button', { name: /sign in/i }))
    expect(await screen.findByText(/enter a valid email/i)).toBeTruthy()
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it('shows the Supabase error message on failed sign in', async () => {
    signInWithPassword.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    })
    const user = userEvent.setup()
    renderApp('/login')
    await user.type(await screen.findByLabelText(/email/i), 'alex@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText(/invalid login credentials/i)).toBeTruthy()
  })

  it('signs in and lands on Home on success', async () => {
    signInWithPassword.mockResolvedValueOnce({
      data: { session: fakeSession },
      error: null,
    })
    const user = userEvent.setup()
    renderApp('/login')
    await user.type(await screen.findByLabelText(/email/i), 'alex@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'correct-password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText(/what's on the list today/i)).toBeTruthy()
  })
})

describe('bottom navigation', () => {
  it('navigates across all five tabs', async () => {
    mockState.session = fakeSession
    const user = userEvent.setup()
    renderApp('/home')

    expect(await screen.findByText(/what's on the list today/i)).toBeTruthy()

    await user.click(screen.getByRole('link', { name: /^categories$/i }))
    expect(await screen.findByText(/browse every aisle/i)).toBeTruthy()

    await user.click(screen.getByRole('link', { name: /cart/i }))
    expect(await screen.findByText(/your cart is empty/i)).toBeTruthy()

    await user.click(screen.getByRole('link', { name: /orders/i }))
    expect(await screen.findByText(/no orders yet/i)).toBeTruthy()

    await user.click(screen.getByRole('link', { name: /profile/i }))
    expect(await screen.findByText(/your account and preferences/i)).toBeTruthy()
    // Profile row loaded from the (mocked) profiles table:
    await waitFor(() => expect(screen.getAllByText(/alex fresher/i).length).toBeGreaterThan(0))
  })
})

describe('theme', () => {
  it('toggles dark mode and persists the choice', async () => {
    mockState.session = fakeSession
    const user = userEvent.setup()
    renderApp('/home')
    await screen.findByText(/what's on the list today/i)

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    await user.click(screen.getByRole('button', { name: /switch to dark mode/i }))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('freshcart-theme')).toBe('dark')

    await user.click(screen.getByRole('button', { name: /switch to light mode/i }))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('freshcart-theme')).toBe('light')
  })
})

describe('sign out', () => {
  it('signs out from Profile and returns to Welcome', async () => {
    mockState.session = fakeSession
    const user = userEvent.setup()
    renderApp('/profile')
    await user.click(await screen.findByRole('button', { name: /sign out/i }))
    await waitFor(() => expect(signOutMock).toHaveBeenCalled())
    expect(await screen.findByText(/minutes away/i)).toBeTruthy()
  })
})

describe('password recovery', () => {
  it('waits for token exchange instead of flashing "link expired"', async () => {
    // Simulate the recovery redirect: getSession resolves slowly with a session.
    mockState.session = fakeSession
    mockState.sessionDelayMs = 150
    renderApp('/reset-password')
    // While initializing, the loader shows — never the expired message.
    expect(screen.getByText(/verifying your link/i)).toBeTruthy()
    expect(screen.queryByText(/link expired/i)).toBeNull()
    // Once the session lands, the form appears.
    expect(await screen.findByText(/choose a new password/i)).toBeTruthy()
  })

  it('shows "link expired" when no recovery session materializes', async () => {
    mockState.session = null
    renderApp('/reset-password')
    expect(await screen.findByText(/link expired/i)).toBeTruthy()
  })
})
