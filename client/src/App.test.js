import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { CartProvider } from './features/cart/CartProvider';

function renderApp() {
  return render(
    <CartProvider>
      <App />
    </CartProvider>
  );
}

test('renders app title', () => {
  renderApp();
  const titleElement = screen.getByText(/fleet device manager/i);
  expect(titleElement).toBeInTheDocument();
});

test('employees screen shows Employee list title', () => {
  renderApp();
  expect(screen.getByText(/Employee list/i)).toBeInTheDocument();
});

test('devices screen shows Device list title', async () => {
  renderApp();
  fireEvent.click(screen.getByRole('button', { name: /^Devices$/i }));
  expect(await screen.findByText(/Device list/i)).toBeInTheDocument();
});

test('catalog screen shows Catalog title', async () => {
  renderApp();
  fireEvent.click(screen.getByRole('button', { name: /^Catalog$/i }));
  expect(await screen.findByText(/^Catalog$/i)).toBeInTheDocument();
});

test('orders screen shows Order history title', async () => {
  renderApp();
  fireEvent.click(screen.getByRole('button', { name: /^Orders$/i }));
  expect(await screen.findByText(/Order history/i)).toBeInTheDocument();
});
