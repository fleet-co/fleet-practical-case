import { render, screen } from "@testing-library/react";
import DataTable from "./DataTable";

const COLUMNS = ["Name", "Age"];
const DATA = [
  { id: 1, name: "Alice", age: 30 },
  { id: 2, name: "Bob", age: 25 },
];

describe("DataTable", () => {
  it("renders column headers", () => {
    render(
      <DataTable
        columns={COLUMNS}
        data={DATA}
        renderRow={(item) => (
          <tr key={item.id}>
            <td>{item.name}</td>
            <td>{item.age}</td>
          </tr>
        )}
      />,
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();
  });

  it("renders data rows", () => {
    render(
      <DataTable
        columns={COLUMNS}
        data={DATA}
        renderRow={(item) => (
          <tr key={item.id}>
            <td>{item.name}</td>
            <td>{item.age}</td>
          </tr>
        )}
      />,
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows empty message when data is empty", () => {
    render(
      <DataTable
        columns={COLUMNS}
        data={[]}
        emptyMessage="Nothing here"
        renderRow={() => null}
      />,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("shows default empty message", () => {
    render(
      <DataTable columns={COLUMNS} data={[]} renderRow={() => null} />,
    );
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("shows loader when loading", () => {
    render(
      <DataTable
        columns={COLUMNS}
        data={[]}
        isLoading={true}
        renderRow={() => null}
      />,
    );
    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
