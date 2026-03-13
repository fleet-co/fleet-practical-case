/**
 * Reusable search text input.
 */
export default function SearchInput({ value, onChange, placeholder = "Search..." }) {
  return (
    <label>
      Search
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
