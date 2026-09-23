/** Profile & settings (Phases 1, 6) — split from app.smoke.test.tsx. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../lib/supabase', async () => (await import('./helpers/state')).supabaseMockModule())
vi.mock('../lib/payments/stripeProvider', async () =>
  (await import('./helpers/state')).stripeMockModule())

import { mockState, fixtures, fakeSession } from './helpers/state'
import { renderApp, resetTestState } from './helpers/render'

beforeEach(resetTestState)

describe('profile details', () => {
  it('shows account info and saves name + phone together', async () => {
    mockState.session = fakeSession
    const user = userEvent.setup()
    renderApp('/profile')

    expect(await screen.findByText('Alex Fresher')).toBeTruthy()
    expect(screen.getByText('alex@example.com')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /edit your details/i }))
    const nameInput = screen.getByLabelText(/full name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Alex F. Grocer')
    await user.type(screen.getByLabelText(/phone/i), '07123 456789')
    await user.click(screen.getByRole('button', { name: /save details/i }))

    expect(await screen.findByText(/details updated/i)).toBeTruthy()
    expect(screen.getByText('Alex F. Grocer')).toBeTruthy()
    expect(screen.getByText('07123 456789')).toBeTruthy()
    expect(fixtures.profiles[0]).toMatchObject({
      full_name: 'Alex F. Grocer',
      phone: '07123 456789',
    })
  })

  it('edits the delivery address from the profile', async () => {
    mockState.session = fakeSession
    const user = userEvent.setup()
    renderApp('/profile')

    expect(await screen.findByText(/not set yet/i)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /edit delivery address/i }))
    await user.type(screen.getByLabelText(/^address$/i), '7 Clementine Court')
    await user.click(screen.getByRole('button', { name: /save address/i }))

    expect(await screen.findByText(/address updated/i)).toBeTruthy()
    expect(screen.getByText(/home · 7 clementine court/i)).toBeTruthy()
    expect(fixtures.profiles[0]).toMatchObject({ address_line: '7 Clementine Court' })
  })
})

describe('appearance settings', () => {
  it('offers Light / System / Dark, persisting only explicit choices', async () => {
    mockState.session = fakeSession
    const user = userEvent.setup()
    renderApp('/profile')

    await user.click(await screen.findByRole('radio', { name: /^dark$/i }))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('freshcart-theme')).toBe('dark')

    // System = follow the OS (polyfill reports light) and store no override.
    await user.click(screen.getByRole('radio', { name: /^system$/i }))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('freshcart-theme')).toBeNull()
  })
})

describe('security settings', () => {
  it('validates and updates the password', async () => {
    mockState.session = fakeSession
    const user = userEvent.setup()
    renderApp('/profile')

    await user.click(await screen.findByRole('button', { name: /change password/i }))
    await user.type(screen.getByLabelText(/^new password$/i), 'short')
    await user.type(screen.getByLabelText(/confirm new password/i), 'different')
    await user.click(screen.getByRole('button', { name: /update password/i }))
    expect(await screen.findByText(/password must be at least/i)).toBeTruthy()
    expect(screen.getByText(/passwords don't match/i)).toBeTruthy()
    expect(mockState.updateUserCalls).toHaveLength(0)

    await user.clear(screen.getByLabelText(/^new password$/i))
    await user.clear(screen.getByLabelText(/confirm new password/i))
    await user.type(screen.getByLabelText(/^new password$/i), 'a-much-safer-passphrase')
    await user.type(screen.getByLabelText(/confirm new password/i), 'a-much-safer-passphrase')
    await user.click(screen.getByRole('button', { name: /update password/i }))

    expect(await screen.findByText(/password updated/i)).toBeTruthy()
    expect(mockState.updateUserCalls[0]).toMatchObject({ password: 'a-much-safer-passphrase' })
  })
})

describe('account deletion', () => {
  it('confirms, calls the edge function, and returns to welcome', async () => {
    mockState.session = fakeSession
    const user = userEvent.setup()
    renderApp('/profile')

    await user.click(await screen.findByRole('button', { name: /^delete$/i }))
    expect(await screen.findByText(/cannot\s+be undone/i)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /yes, delete everything/i }))

    expect(await screen.findByRole('heading', { name: /your market/i })).toBeTruthy()
    expect(mockState.functionCalls).toContain('delete-account')
  })

  it('surfaces a failure without signing the user out', async () => {
    mockState.session = fakeSession
    mockState.deleteAccountError = 'Service unavailable'
    const user = userEvent.setup()
    renderApp('/profile')

    await user.click(await screen.findByRole('button', { name: /^delete$/i }))
    await user.click(await screen.findByRole('button', { name: /yes, delete everything/i }))

    expect(await screen.findByText(/service unavailable/i)).toBeTruthy()
    expect(screen.getByText('Alex Fresher')).toBeTruthy() // still on profile
  })
})
