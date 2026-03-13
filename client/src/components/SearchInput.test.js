import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchInput from "./SearchInput";

describe("SearchInput", () => {
  it("renders label and input with placeholder", () => {
    render(<SearchInput value="" onChange={() => {}} placeholder="Search..." />);
    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("calls onChange when typing", async () => {
    const handleChange = jest.fn();
    render(<SearchInput value="" onChange={handleChange} />);
    await userEvent.type(screen.getByRole("textbox"), "hello");
    expect(handleChange).toHaveBeenCalledTimes(5);
  });

  it("displays current value", () => {
    render(<SearchInput value="test" onChange={() => {}} />);
    expect(screen.getByRole("textbox")).toHaveValue("test");
  });
});
