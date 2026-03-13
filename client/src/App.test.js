import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders navigation tabs", () => {
  render(<App />);
  expect(screen.getByText(/employees/i)).toBeInTheDocument();
  expect(screen.getByText(/devices/i)).toBeInTheDocument();
  expect(screen.getByText(/catalog/i)).toBeInTheDocument();
  expect(screen.getByText(/orders/i)).toBeInTheDocument();
});
