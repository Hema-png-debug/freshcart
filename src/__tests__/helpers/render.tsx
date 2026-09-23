/** Shared render + reset utilities for the split test suite. */
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../../App'
import { ThemeProvider } from '../../context/ThemeContext'
import { AuthProvider } from '../../context/AuthContext'
import { clearCatalogCache } from '../../lib/catalog'
import { resetMockState } from './state'

export function renderApp(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

/** Call from beforeEach in every test file. */
export function resetTestState() {
  resetMockState()
  clearCatalogCache()
}
