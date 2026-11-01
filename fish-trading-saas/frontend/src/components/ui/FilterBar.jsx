import React from "react";
import AdvancedFilterBar from "./AdvancedFilterBar";
import Button from "./Button";

export default function FilterBar({ onFilter }) {
  const [filterState, setFilterState] = React.useState({
    search: "",
    status: "",
    date_range_start: "",
    date_range_end: "",
  });

  const filters = [
    { type: "search", key: "search", label: "Search..." },
    { type: "select", key: "status", label: "Status", options: [
      { value: "completed", label: "Completed" },
      { value: "pending", label: "Pending" },
    ] },
    { type: "daterange", key: "date_range", label: "Date Range" },
  ];

  const handleChange = (values) => {
    setFilterState(values);
    // Map daterange keys to from/to for backend compatibility
    const mapped = {
      ...values,
      from: values.date_range_start,
      to: values.date_range_end,
    };
    onFilter?.(mapped);
  };

  const handleReset = () => {
    setFilterState({ search: "", status: "", date_range_start: "", date_range_end: "" });
    onFilter?.({ search: "", status: "", from: "", to: "" });
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4 items-center">
      <AdvancedFilterBar
        filters={filters}
        initialValues={filterState}
        onChange={handleChange}
        className="flex-1"
      />
      <Button variant="outline" onClick={handleReset} className="h-10">Reset</Button>
    </div>
  );
}
