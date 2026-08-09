import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Future Estate title', () => {
  render(<App />);
  const titleElements = screen.getAllByText(/FUTURE/i);
  expect(titleElements.length).toBeGreaterThan(0);
});
