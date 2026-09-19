import React, { useState } from 'react';

const SearchableClientSelect = ({ items, value, onChange, getLabel, getSearchText, placeholder = 'Select client', searchPlaceholder = 'Search clients by name or email', ...selectProps }) => {
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase();
  const visibleItems = items.filter((item) =>
    !query || String(item.id) === String(value) ||
    String(getSearchText ? getSearchText(item) : getLabel(item)).toLocaleLowerCase().includes(query)
  );

  return (
    <>
      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
        style={{ width: '100%', padding: 8, marginBottom: 8 }}
      />
      <select value={value} onChange={onChange} {...selectProps}>
        <option value="">{placeholder}</option>
        {visibleItems.map((item) => (
          <option key={item.id} value={item.id}>{getLabel(item)}</option>
        ))}
        {query && visibleItems.length === 0 && <option disabled>No matching clients</option>}
      </select>
    </>
  );
};

export default SearchableClientSelect;
