import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from '../ThemeToggle'
import { ThemeProvider } from '@/contexts/ThemeContext'

// Mock the theme context
const mockSetTheme = jest.fn()
const mockThemeContext = {
  theme: 'light',
  setTheme: mockSetTheme,
  isDark: false,
  isLight: true,
  isSystem: false,
}

// Mock the theme context
jest.mock('@/contexts/ThemeContext', () => ({
  useEMSTheme: () => mockThemeContext,
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  )
}

describe('ThemeToggle Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the theme toggle button', () => {
    renderWithTheme(<ThemeToggle />)
    
    const toggleButton = screen.getByRole('button', { name: /toggle theme/i })
    expect(toggleButton).toBeInTheDocument()
  })

  it('shows light theme icon when theme is light', () => {
    renderWithTheme(<ThemeToggle />)
    
    // The Sun icon should be visible in light mode (using class selector)
    const sunIcon = document.querySelector('.lucide-sun')
    expect(sunIcon).toBeInTheDocument()
  })

  it('opens dropdown menu when clicked', async () => {
    const user = userEvent.setup()
    renderWithTheme(<ThemeToggle />)
    
    const toggleButton = screen.getByRole('button', { name: /toggle theme/i })
    await user.click(toggleButton)
    
    // Check if dropdown menu items are visible
    expect(screen.getByText('Light')).toBeInTheDocument()
    expect(screen.getByText('Dark')).toBeInTheDocument()
    expect(screen.getByText('System')).toBeInTheDocument()
  })

  it('calls setTheme with "light" when light option is clicked', async () => {
    const user = userEvent.setup()
    renderWithTheme(<ThemeToggle />)
    
    const toggleButton = screen.getByRole('button', { name: /toggle theme/i })
    await user.click(toggleButton)
    
    const lightOption = screen.getByText('Light')
    await user.click(lightOption)
    
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })

  it('calls setTheme with "dark" when dark option is clicked', async () => {
    const user = userEvent.setup()
    renderWithTheme(<ThemeToggle />)
    
    const toggleButton = screen.getByRole('button', { name: /toggle theme/i })
    await user.click(toggleButton)
    
    const darkOption = screen.getByText('Dark')
    await user.click(darkOption)
    
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('calls setTheme with "system" when system option is clicked', async () => {
    const user = userEvent.setup()
    renderWithTheme(<ThemeToggle />)
    
    const toggleButton = screen.getByRole('button', { name: /toggle theme/i })
    await user.click(toggleButton)
    
    const systemOption = screen.getByText('System')
    await user.click(systemOption)
    
    expect(mockSetTheme).toHaveBeenCalledWith('system')
  })

  it('highlights the current theme option', async () => {
    const user = userEvent.setup()
    renderWithTheme(<ThemeToggle />)
    
    const toggleButton = screen.getByRole('button', { name: /toggle theme/i })
    // Click to open dropdown
    await user.click(toggleButton)
    
    // Since isLight is true in our mock, the Light option should have the accent class
    const lightOption = screen.getByText('Light').closest('[role="menuitem"]')
    expect(lightOption).toHaveClass('bg-accent')
  })
})
