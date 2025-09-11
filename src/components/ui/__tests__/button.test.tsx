import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../button';

describe('Button Component', () => {
  it('renders with default props', () => {
    const { getByRole } = render(<Button>Click me</Button>);
    const button = getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary');
  });

  it('handles click events', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    const { getByRole } = render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = getByRole('button', { name: /click me/i });
    await user.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders with different variants', () => {
    const { getByRole } = render(<Button variant="outline">Outline Button</Button>);
    const button = getByRole('button', { name: /outline button/i });
    expect(button).toHaveClass('border-input');
  });

  it('renders as disabled', () => {
    const { getByRole } = render(<Button disabled>Disabled Button</Button>);
    const button = getByRole('button', { name: /disabled button/i });
    expect(button).toBeDisabled();
  });

  it('renders with different sizes', () => {
    const { getByRole } = render(<Button size="sm">Small Button</Button>);
    const button = getByRole('button', { name: /small button/i });
    expect(button).toHaveClass('h-9');
  });
});