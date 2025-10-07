import React, { useEffect, useState, useRef } from 'react';

function Tooltip({ visible, top, left, children }) {
  if (!visible) return null;
  return (
    <div
      className="pss-tooltip"
      style={{
        position: 'fixed',
        top: top || 40,
        left: left || 40,
        transform: 'translate(-50%, -100%)',
        zIndex: 100,
      }}
    >
      {children}
    </div>
  );
}

function App() {
  const [ctrlPressed, setCtrlPressed] = useState(false);
  const [inventory, setInventory] = useState(null);
  const [prices, setPrices] = useState(null);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [search, setSearch] = useState('');
  const [hoveredRow, setHoveredRow] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const rowRefs = useRef([]);
  const containerRef = useRef(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Fix: Use e.getModifierState('Control') for reliable Ctrl detection
    const handleKeyDown = (e) => {
      const ctrl = e.getModifierState && e.getModifierState('Control') || e.key === 'Control';
      setCtrlPressed(ctrl);

      if (e.key === 'Escape') setTooltipVisible(false);

      if (ctrl && hoveredRow !== null) {
        const rowEl = rowRefs.current[hoveredRow];
        if (rowEl) {
          const rect = rowEl.getBoundingClientRect();
          setTooltipVisible(true);
          setTooltipPos({ top: rect.top + rect.height / 2, left: rect.left + rect.width / 2 });
        }
      }
    };

    const handleKeyUp = (e) => {
      setCtrlPressed(false);
    };

    const handleClick = (e) => {
      if (!e.target.closest('.pss-tooltip')) {
        setTooltipVisible(false);
        setHoveredRow(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleClick);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleClick);
    };
  }, [hoveredRow, tooltipVisible]);

  useEffect(() => {
    const inventoryPath = import.meta.env.DEV ? './docs/inventory.json' : './inventory.json';

    fetch(inventoryPath)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load inventory.json');
        return res.json();
      })
      .then(setInventory)
      .catch(setError);

    const pricesPath = import.meta.env.DEV ? './docs/prices.json' : './prices.json';
    fetch(pricesPath)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load prices.json');
        return res.json();
      })
      .then(setPrices)
      .catch(setError);
  }, []);

  if (error) return <div style={{color: 'red'}}>Error: {error.message}</div>;
  if (!inventory || !prices) return <div>Loading...</div>;

  if (Array.isArray(inventory)) {
    // Columns to show in specific order
    const columns = [
      "name",
      "bonus",
      "item_sub_type",
      "price"
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
        } else if (sortConfig.key === 'price') {
          // Sort by item_price if present, else prices.json
          const aPrice = typeof a.item_price !== 'undefined' ? Number(a.item_price) : Number(prices[a.item_id]);
          const bPrice = typeof b.item_price !== 'undefined' ? Number(b.item_price) : Number(prices[b.item_id]);
          const aBlank = isNaN(aPrice) || aPrice === 0;
          const bBlank = isNaN(bPrice) || bPrice === 0;
          if (aBlank && bBlank) return 0;
          if (aBlank) return 1;
          if (bBlank) return -1;
          if (aPrice < bPrice) return -1 * dir;
          if (aPrice > bPrice) return 1 * dir;
          return 0;
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
          // For price: desc -> asc -> reset; for others: asc -> desc -> reset
          if (key === 'price') {
            if (prev.direction === 'desc') {
              return { key, direction: 'asc' };
            } else if (prev.direction === 'asc') {
              return { key: null, direction: 'desc' };
            }
            // First click: sort descending
            return { key, direction: 'desc' };
          } else {
            if (prev.direction === 'asc') {
              return { key, direction: 'desc' };
            } else if (prev.direction === 'desc') {
              return { key: null, direction: 'asc' };
            }
            // First click: sort ascending
            return { key, direction: 'asc' };
          }
        }
        // First click: sort descending for price, ascending for others
        return { key, direction: key === 'price' ? 'desc' : 'asc' };
      });
    };

    // Friendly labels for headers
    const headerLabels = {
      name: 'Name',
      bonus: 'Bonus',
      item_sub_type: 'Type',
      price: 'Price',
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
      <div className="container" style={{ position: 'relative' }} ref={containerRef}>
        <h1>Inventory</h1>
        <p className="intro-text">Prices displayed are my initial asking prices based on market research from pixyship and may change over time. Fair offers are welcome and discount agreements could be reached for purchasing multiple items.</p>
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
                    style={{ cursor: 'pointer', userSelect: 'none', textAlign: key === 'price' ? 'right' : undefined }}
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
                  ref={el => rowRefs.current[idx] = el}
                  className={getRarityClass(item.rarity)}
                  style={{ cursor: 'pointer' }}
                  onClick={e => {
                    if (!ctrlPressed) {
                      window.open(`https://pixyship.com/item/${item.item_design_id}`, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      window.open(`https://pixyship.com/item/${item.item_design_id}`, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  onMouseEnter={() => {
                    setHoveredRow(idx);
                    if (ctrlPressed) {
                      const rowEl = rowRefs.current[idx];
                      if (rowEl) {
                        const rect = rowEl.getBoundingClientRect();
                        setTooltipVisible(true);
                        setTooltipPos({ top: rect.top + rect.height / 2, left: rect.left + rect.width / 2 });
                      }
                    } else {
                      setTooltipVisible(false);
                    }
                  }}
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

                    if (key === 'price') {
                      // Use item_price from inventory.json if present, else prices.json
                      let price = typeof item.item_price !== 'undefined' ? item.item_price : prices[item.item_id];
                      if (price && !isNaN(Number(price))) {
                        price = Number(price).toLocaleString();
                      }
                      return (
                        <td key={key} style={{ textAlign: 'right' }}>
                          {price ? highlightText(price) : ''}
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

        <Tooltip
          visible={tooltipVisible && sorted[hoveredRow] && hoveredRow !== null}
          top={tooltipPos.top}
          left={tooltipPos.left}
        >
          {sorted[hoveredRow] && hoveredRow !== null && (
            <span className="pss-tooltip-text"><strong>Item ID:</strong> <span style={{ fontFamily: 'monospace' }}>{sorted[hoveredRow].item_id}</span></span>
          )}
        </Tooltip>
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
