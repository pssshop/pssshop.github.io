import React, { useEffect, useState } from 'react';

function App() {
  const [inventory, setInventory] = useState(null);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [search, setSearch] = useState('');

  useEffect(() => {
    const inventoryPath = import.meta.env.DEV ? './docs/inventory.json' : './inventory.json';
    fetch(inventoryPath)
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
      "name",
      "bonus",
      "item_sub_type"
    ];

    // Search filter
    const filtered = inventory.filter(item => {
      // For the 'bonus' column, search the combined string
      const bonusString = item.bonus_type ? `${item.bonus_type} +${item.bonus_value}` : '';
      return (
        (item.name && item.name.toLowerCase().includes(search.toLowerCase())) ||
        (bonusString && bonusString.toLowerCase().includes(search.toLowerCase()))
      );
    });

    // Sorting
    const sorted = [...filtered];
    if (sortConfig.key) {
      const dir = sortConfig.direction === 'asc' ? 1 : -1;
      sorted.sort((a, b) => {
        if (sortConfig.key === 'bonus') {
            if (a.bonus_type == b.bonus_type) return (Number(b.bonus_value) - Number(a.bonus_value)) * dir;
            return a.bonus_type < b.bonus_type ? -1 * dir : dir;
        } else {
          let aVal = a[sortConfig.key];
          let bVal = b[sortConfig.key];
          if (!isNaN(Number(aVal)) && !isNaN(Number(bVal))) {
            aVal = Number(aVal);
            bVal = Number(bVal);
          }
          if (aVal < bVal) return -1 * dir;
          if (aVal > bVal) return 1 * dir;
          return 0;
        }
      });
    }

    // Sort handler
    const handleSort = (key) => {
      setSortConfig((prev) => {
        if (prev.key === key) {
          if (prev.direction === 'asc') {
            return { key, direction: 'desc' };
          } else if (prev.direction === 'desc') {
            // Third click: reset sorting
            return { key: null, direction: 'asc' };
          }
        }
        // First click: sort ascending
        return { key, direction: 'asc' };
      });
    };

    // Friendly labels for headers
    const headerLabels = {
      name: 'Name',
      bonus: 'Bonus',
      item_sub_type: 'Type',
    };

    // Helper to get rarity class
    const getRarityClass = (rarity) => {
      if (!rarity) return 'rarity-common';
      return 'rarity-' + rarity.toLowerCase();
    };

    // Helper to highlight search text
    const highlightText = (text) => {
      if (!search) return text;
      const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const parts = String(text).split(regex);
      return parts.map((part, i) =>
        regex.test(part)
          ? <span key={i} className="search-highlight">{part}</span>
          : part
      );
    };

    return (
      <div className="container">
        <h1>Inventory</h1>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
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
                    {headerLabels[key]}
                    {sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, idx) => (
                <tr
                  key={idx}
                  className={getRarityClass(item.rarity)}
                  style={{ cursor: 'pointer' }}
                  onClick={() => window.open(`https://pixyship.com/item/${item.item_design_id}`, '_blank', 'noopener,noreferrer')}
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      window.open(`https://pixyship.com/item/${item.item_design_id}`, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  title={`View ${item.name} on Pixyship`}
                >
                  {columns.map((key) => {
                    if (key === 'bonus') {
                      return (
                        <td
                          key={key}
                          data-bonus-type={item.bonus_type || ''}
                          data-bonus-value={item.bonus_value || ''}
                        >
                          {item.bonus_type ? highlightText(`${item.bonus_type} +${item.bonus_value}`) : ''}
                        </td>
                      );
                    }
                    return (
                      <td key={key}>
                        {key === 'name' ? (
                          <>
                            <img
                              src={`https://api.pixelstarships.com/FileService/DownloadSprite?spriteId=${item.item_sprite_id}`}
                              alt={item.name}
                              style={{ width: 24, height: 24, objectFit: 'contain', verticalAlign: 'middle', marginRight: 6 }}
                            />
                            {highlightText(`${item.name}${Number(item.quantity) > 1 ? ` x${item.quantity}` : ''}`)}
                          </>
                        ) : key === 'item_sub_type' && typeof item[key] === 'string'
                          ? highlightText(item[key].replace(/^Equipment/, '').replace(/^\s+/, ''))
                          : highlightText(item[key])}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Items for Trade</h1>
      <pre>{JSON.stringify(inventory, null, 2)}</pre>
    </div>
  );
}

export default App;
