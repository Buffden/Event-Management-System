import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@/contexts/ThemeContext'

// Mock the theme context for basic tests
const mockThemeContext = {
  theme: 'light',
  setTheme: jest.fn(),
  isDark: false,
  isLight: true,
  isSystem: false,
}

jest.mock('@/contexts/ThemeContext', () => ({
  useEMSTheme: () => mockThemeContext,
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe('Frontend Test Setup', () => {
  it('should have testing library available', () => {
    expect(render).toBeDefined()
    expect(screen).toBeDefined()
  })

  it('should have environment variables configured', () => {
    expect(process.env.NEXT_PUBLIC_API_URL).toBe('http://localhost:3001')
    expect(process.env.NEXT_PUBLIC_APP_NAME).toBe('Event Management System')
  })

  it('should render a simple component', () => {
    const TestComponent = () => <div data-testid="test-component">Hello World</div>
    
    render(<TestComponent />)
    
    const element = screen.getByTestId('test-component')
    expect(element).toBeInTheDocument()
    expect(element).toHaveTextContent('Hello World')
  })

  it('should have theme context available', () => {
    const TestComponent = () => {
      const { theme } = mockThemeContext
      return <div data-testid="theme-test">Theme: {theme}</div>
    }
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )
    
    const element = screen.getByTestId('theme-test')
    expect(element).toBeInTheDocument()
    expect(element).toHaveTextContent('Theme: light')
  })

  it('should have custom Jest matchers available', () => {
    const element = document.createElement('div')
    element.textContent = 'Test'
    document.body.appendChild(element)
    
    expect(element).toBeInTheDocument()
    expect(element).toHaveTextContent('Test')
    
    document.body.removeChild(element)
  })
})
