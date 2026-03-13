import { render, screen } from "@testing-library/react";
import Loader from "./Loader";

describe("Loader", () => {
  it("renders with accessible label", () => {
    render(<Loader />);
    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
  });

  it("has loader class", () => {
    render(<Loader />);
    expect(screen.getByLabelText("Loading")).toHaveClass("loader");
  });
});
