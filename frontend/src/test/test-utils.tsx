import type { ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

interface RenderWithRouterOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string
}

export function renderWithRouter(
  ui: ReactElement,
  { route = '/', ...options }: RenderWithRouterOptions = {},
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    ),
    ...options,
  })
}

export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
