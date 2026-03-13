import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SelectFilter from "./SelectFilter";

describe("SelectFilter", () => {
  it("renders label and All option", () => {
    render(
      <SelectFilter label="Category" value="" onChange={() => {}} options={["A", "B"]} />,
    );
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("All")).toBeInTheDocument();
  });

  it("renders string options", () => {
    render(
      <SelectFilter label="Type" value="" onChange={() => {}} options={["Laptop", "Phone"]} />,
    );
    expect(screen.getByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText("Phone")).toBeInTheDocument();
  });

  it("renders object options with value/label", () => {
    render(
      <SelectFilter
        label="Owner"
        value=""
        onChange={() => {}}
        options={[
          { value: "1", label: "Alice" },
          { value: "2", label: "Bob" },
        ]}
      />,
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("calls onChange when selection changes", async () => {
    const handleChange = jest.fn();
    render(
      <SelectFilter label="Type" value="" onChange={handleChange} options={["Laptop", "Phone"]} />,
    );
    await userEvent.selectOptions(screen.getByRole("combobox"), "Laptop");
    expect(handleChange).toHaveBeenCalledWith("Laptop");
  });
});
