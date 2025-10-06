import React, { useEffect, useState } from 'react';

function App() {
  const [inventory, setInventory] = useState(null);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('./inventory.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load inventory.json');
        return res.json();
      })
      .then(setInventory)
      .catch(setError);
  }, []);

  if (error) return <div style={{color: 'red'}}>Error: {error.message}</div>;
  if (!inventory) return <div>Loading...</div>;

  // If inventory is an array of items
  if (Array.isArray(inventory)) {
    // Columns to show in specific order
    const columns = [
      "quantity",
      "name",
      "bonus_type",
      "bonus_value",
      "rarity",
      "item_sub_type"
    ];

    // Search filter
    const filtered = inventory.filter(item =>
      columns.some(key =>
        String(item[key] ?? '').toLowerCase().includes(search.toLowerCase())
      )
    );

    // Sorting
    const sorted = [...filtered];
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        // Try numeric sort if possible
        if (!isNaN(Number(aVal)) && !isNaN(Number(bVal))) {
          aVal = Number(aVal);
          bVal = Number(bVal);
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Sort handler
    const handleSort = (key) => {
      setSortConfig((prev) => {
        if (prev.key === key) {
          return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
        }
        return { key, direction: 'asc' };
      });
    };
    return (
      <div className="container">
        <h1>Inventory</h1>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: '1rem', width: '100%', padding: '0.5rem', fontSize: '1rem', boxSizing: 'border-box' }}
        />
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                {columns.map((key) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    {key}
                    {sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, idx) => (
                <tr key={idx}>
                  {columns.map((key) => (
                    <td key={key}>{item[key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // If inventory is an object
  return (
    <div className="container">
      <h1>Inventory</h1>
      <pre>{JSON.stringify(inventory, null, 2)}</pre>
    </div>
  );
}

export default App;
