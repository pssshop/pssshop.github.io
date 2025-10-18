import { useEffect, useState, useRef, useMemo } from 'react';

function Tooltip({ visible, top, left, children }) {
    if (!visible) return null;
    return (
        <div className="pss-tooltip" style={{ top: top || 40, left: left || 40 }}>
            {children}
        </div>
    );
}

// Add theme toggle floating in top right
function ThemeToggle({ theme, setTheme }) {
    const [open, setOpen] = useState(false);
    // Icon: use a simple sun/moon/auto icon based on theme
    let icon;
    if (theme === 'dark') {
        icon = (
            <span title="Dark mode" className="theme-toggle-icon">
                🌙
            </span>
        );
    } else if (theme === 'light') {
        icon = (
            <span title="Light mode" className="theme-toggle-icon">
                ☀️
            </span>
        );
    } else {
        icon = (
            <span title="Auto" className="theme-toggle-icon">
                🌓
            </span>
        );
    }

    // Open menu on click or hover
    const handleToggleMenu = (e) => {
        e.preventDefault();
        setOpen((prev) => !prev);
    };

    // Determine theme for menu
    const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    return (
        <div
            className="theme-toggle"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onClick={handleToggleMenu}
            aria-label="Theme toggle"
            role="button"
        >
            {icon}
            {open && (
                <div
                    className={`theme-toggle-menu${isDark ? ' theme-toggle-menu-dark' : ''}`}
                    onMouseEnter={() => setOpen(true)}
                    onMouseLeave={() => setOpen(false)}
                >
                    <button
                        type="button"
                        onClick={() => {
                            setTheme('auto');
                            setOpen(false);
                        }}
                        className={`theme-toggle-btn${theme === 'auto' ? ' selected' : ''}${isDark ? ' dark' : ''}`}
                    >
                        🌓 Auto
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setTheme('light');
                            setOpen(false);
                        }}
                        className={`theme-toggle-btn${theme === 'light' ? ' selected' : ''}${isDark ? ' dark' : ''}`}
                    >
                        ☀️ Light
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setTheme('dark');
                            setOpen(false);
                        }}
                        className={`theme-toggle-btn${theme === 'dark' ? ' selected' : ''}${isDark ? ' dark' : ''}`}
                    >
                        🌙 Dark
                    </button>
                </div>
            )}
        </div>
    );
}

function App() {
    const [adminView, setAdminView] = useState(false);
    const [inventory, setInventory] = useState(null);
    const [prices, setPrices] = useState(null);
    const [error, setError] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [search, setSearch] = useState('');
    const [hoveredRow, setHoveredRow] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [theme, setTheme] = useState(() => {
        // Try to restore theme from localStorage
        try {
            const saved = localStorage.getItem('pss_theme');
            if (saved === 'dark' || saved === 'light' || saved === 'auto') return saved;
        } catch {}
        return 'auto';
    });
    const rowRefs = useRef([]);
    const containerRef = useRef(null);
    const [adminPriceEdits, setAdminPriceEdits] = useState({});

    // --- helpers ---
    const parseNumber = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    };

    const getCanonicalPrice = (itemId, item, preferAdmin = false) => {
        const id = String(itemId);
        const edit = adminPriceEdits[id];
        const editNum = typeof edit !== 'undefined' && edit !== null && edit !== '' ? parseNumber(edit) : null;
        const invNum = typeof item?.item_price !== 'undefined' && item.item_price !== null && item.item_price !== '' ? parseNumber(item.item_price) : null;
        // prices.json stores objects: { price, lastUpdate }
        const priceJson = prices?.[id] && typeof prices[id] === 'object' && prices[id].price !== undefined ? parseNumber(prices[id].price) : null;
        if (preferAdmin) return editNum !== null ? editNum : (invNum !== null ? invNum : priceJson);
        // normal view: prefer inventory.item_price when present, fall back to prices.json
        return invNum !== null ? invNum : priceJson;
    };

    const getEstimateNum = (item) => {
        if (!item) return null;
        const e = item.pixyship_estimate;
        return typeof e !== 'undefined' && e !== null && e !== '' && !isNaN(Number(e)) ? parseNumber(e) : null;
    };

    const computePercentAndColor = (priceNum, estimateNum) => {
        if (priceNum === null || estimateNum === null) return { percent: null, color: '' };
        const percent = (((priceNum - estimateNum) / estimateNum) * 100).toFixed(1);
        const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        const color = isDark ? (priceNum <= estimateNum ? '#318741ff' : '#872b2bff') : (priceNum <= estimateNum ? '#2c4a00ff' : '#330000ff');
        return { percent, color };
    };

    // memoize totals and mapping
    const totals = useMemo(() => {
        let totalCount = 0;
        let totalPrice = 0;
        (inventory?.items || []).forEach((it) => {
            const qty = Number(it.quantity) || 1;
            totalCount += qty;
            const used = getCanonicalPrice(it.item_id, it, true);
            if (used !== null) totalPrice += used * qty;
        });
        return { totalCount, totalPrice };
    }, [inventory, adminPriceEdits, prices]);

    const pricesMapping = useMemo(() => {
        const out = {};
        (inventory?.items || []).forEach((it) => {
            const id = String(it.item_id);
            const val = getCanonicalPrice(it.item_id, it, true);
            if (val !== null) out[id] = val;
        });
        return out;
    }, [inventory, adminPriceEdits, prices]);

    useEffect(() => {
        // F1 toggles admin view, Escape clears search and tooltip
        const handleKeyDown = (e) => {
            if (e.key === 'F1' && !e.repeat) {
                e.preventDefault();
                setAdminView((prev) => !prev);
            }

            if (e.key === 'Escape') {
                setTooltipVisible(false);
                setSearch('');
            }

            // Tooltip logic (only in admin view)
            if (adminView && hoveredRow !== null) {
                const rowEl = rowRefs.current[hoveredRow];
                if (rowEl) {
                    const rect = rowEl.getBoundingClientRect();
                    setTooltipVisible(true);
                    setTooltipPos({ top: rect.top + rect.height / 2, left: rect.left + rect.width / 2 });
                }
            }
        };

        const handleClick = (e) => {
            if (!e.target.closest('.pss-tooltip')) {
                setTooltipVisible(false);
                setHoveredRow(null);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousedown', handleClick);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handleClick);
        };
    }, [hoveredRow, tooltipVisible, adminView]);

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

    useEffect(() => {
        // Save theme to localStorage
        try {
            localStorage.setItem('pss_theme', theme);
        } catch {}
        if (theme === 'auto') {
            document.documentElement.removeAttribute('data-theme');
            // Use prefers-color-scheme for auto
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
            }
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
    }, [theme]);

    // Helper to update an admin edit
    const handlePriceEdit = (itemId, value) => {
        // allow empty string to clear override
        setAdminPriceEdits((prev) => {
            const next = { ...prev };
            if (value === '' || value === null) {
                delete next[itemId];
            } else {
                // store as string to preserve input, convert when exporting
                next[itemId] = value;
            }
            return next;
        });
    };


    // Download generated prices.json
    const downloadPricesJson = (items) => {
        // Build a mapping where values are objects: { price, lastUpdate }
        const now = new Date();
        const nowStr = now.toISOString().replace('T', ' ').slice(0, 19);
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        const out = {};

        // Build a set of item IDs present in `items`
        const itemIds = new Set((items || []).map((it) => String(it.item_id)));

        // Start with existing prices.json entries that are recent (<=7 days).
        // If the price belongs to an item in `items`, refresh lastUpdate to nowStr when keeping it.
        // If it belongs to a non-item, include it but preserve its original lastUpdate (do not overwrite).
        Object.keys(prices || {}).forEach((key) => {
            const val = prices[key];
            if (val && typeof val === 'object' && val.price !== undefined) {
                const p = Number(val.price);
                const lu = val.lastUpdate ? new Date(val.lastUpdate.replace(' ', 'T')) : null;
                if (!isNaN(p)) {
                    // keep if lastUpdate is within 7 days or missing
                    if (!lu || (now - lu) <= sevenDays) {
                        if (itemIds.has(String(key))) {
                            out[key] = { price: p, lastUpdate: nowStr };
                        } else {
                            out[key] = { price: p, lastUpdate: val.lastUpdate || nowStr };
                        }
                    }
                }
            }
        });

        // Ensure current items / admin edits are included (override existing)
        (items || []).forEach((it) => {
            const id = String(it.item_id);
            const edit = adminPriceEdits[id];
            const editNum = typeof edit !== 'undefined' && edit !== null && edit !== '' ? Number(edit) : null;
            const invNum = typeof it.item_price !== 'undefined' && it.item_price !== null && it.item_price !== '' ? Number(it.item_price) : null;
            const priceJsonVal = prices && prices[id] && typeof prices[id] === 'object' && prices[id].price !== undefined ? Number(prices[id].price) : null;
            // Prefer admin override -> inventory.item_price -> prices.json
            const used = editNum !== null ? editNum : (invNum !== null ? invNum : priceJsonVal);
            if (used !== null && !isNaN(used)) {
                out[id] = { price: used, lastUpdate: nowStr };
            }
        });

        const blob = new Blob([JSON.stringify(out, null, 4)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'prices.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    if (error) return <div className="error-text">Error: {error.message}</div>;
    if (!inventory || !prices) return <div>Loading...</div>;

    // Use new inventory format: { generated, item_count, items: [...] }
    if (Array.isArray(inventory?.items)) {
        const items = inventory.items;
        // Columns to show in specific order
        const columns = ['name', 'bonus', 'item_sub_type', 'price'];

        // Search filter
        const filtered = items.filter((item) => {
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
                    // Sort by item_price if present, else prices.json (object form)
                    const getVal = (itm) => {
                        if (typeof itm.item_price !== 'undefined' && itm.item_price !== null && itm.item_price !== '') {
                            const n = Number(itm.item_price);
                            return Number.isFinite(n) ? n : NaN;
                        }
                        if (prices && prices[itm.item_id] && typeof prices[itm.item_id] === 'object' && prices[itm.item_id].price !== undefined) {
                            const n = Number(prices[itm.item_id].price);
                            return Number.isFinite(n) ? n : NaN;
                        }
                        return NaN;
                    };
                    const aPrice = getVal(a);
                    const bPrice = getVal(b);
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
                regex.test(part) ? (
                    <span key={i} className="search-highlight">
                        {part}
                    </span>
                ) : (
                    part
                ),
            );
        };

        return (
            <>
                <ThemeToggle theme={theme} setTheme={setTheme} />
                <div className="container" ref={containerRef}>
                    <h1>Inventory</h1>
                    {adminView && (
                        <div className="admin-float">
                            <button
                                type="button"
                                onClick={() => {
                                    downloadPricesJson(items);
                                }}
                                title="Download prices.json"
                                className="admin-toggle-button"
                            >
                                Export
                            </button>

                            {/* Admin summary: total count and total price using admin overrides */}
                            <div className="admin-summary">
                                <div>Items: <strong>{totals.totalCount}</strong></div>
                                <div>Price: <strong>{totals.totalPrice.toLocaleString()}</strong></div>
                            </div>
                        </div>
                    )}

                    <p className="intro-text">
                        Prices displayed are my initial asking prices based on market research from pixyship and may
                        change over time. Fair offers are welcome and discount agreements could be reached for
                        purchasing multiple items. {inventory?.generated && (
                            <span
                                className="updated-text"
                                title={`Updated: ${new Date(inventory.generated.replace(' ', 'T')).toLocaleString()}`}
                            >
                                Updated {new Date(inventory.generated.replace(' ', 'T')).toLocaleDateString()}
                            </span>
                        )}
                    </p>
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                aria-label="Clear search"
                                title="Clear search"
                                className="search-clear-btn"
                            >
                                &#10006;
                            </button>
                        )}
                    </div>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    {columns.map((key) => (
                                        <th key={key} className={`th-cell ${key === 'price' ? 'th-price' : ''}`} onClick={() => handleSort(key)}>
                                            {headerLabels[key]}
                                            {sortConfig.key === key
                                                ? sortConfig.direction === 'asc'
                                                    ? ' ▲'
                                                    : ' ▼'
                                                : ''}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.map((item, idx) => (
                                    <tr
                                        key={idx}
                                        ref={(el) => (rowRefs.current[idx] = el)}
                                        className={`${getRarityClass(item.rarity)} clickable-row`}
                                        onClick={(e) => {
                                            window.open(
                                                `https://pixyship.com/item/${item.item_design_id}?activeTab=tab-players-sales`,
                                                '_blank',
                                                'noopener,noreferrer',
                                            );
                                        }}
                                        onMouseEnter={() => {
                                            setHoveredRow(idx);
                                            if (adminView) {
                                                const rowEl = rowRefs.current[idx];
                                                if (rowEl) {
                                                    const rect = rowEl.getBoundingClientRect();
                                                    setTooltipVisible(true);
                                                    setTooltipPos({
                                                        top: rect.top + rect.height / 2,
                                                        left: rect.left + rect.width / 2,
                                                    });
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
                                                        {item.bonus_type
                                                            ? highlightText(`${item.bonus_type} +${item.bonus_value}`)
                                                            : ''}
                                                    </td>
                                                );
                                            }

                                            if (key === 'price') {
                                                const id = String(item.item_id);
                                                const priceNum = getCanonicalPrice(id, item, adminView);
                                                const priceStr = priceNum !== null ? priceNum.toLocaleString() : '';
                                                const estimateNum = getEstimateNum(item);
                                                const estimate = estimateNum !== null ? estimateNum.toLocaleString() : null;
                                                const showEstimateOnly = priceNum === null && estimateNum !== null;
                                                const { percent: percentDiff, color } = computePercentAndColor(priceNum, estimateNum);
                                                return (
                                                    <td
                                                        key={key}
                                                        className="price-col"
                                                        title={estimate ? `Pixyship Estimate: ${estimate}` : undefined}
                                                        style={{ fontStyle: showEstimateOnly ? 'italic' : undefined, '--admin-price-color': adminView ? color : undefined }}
                                                    >
                                                        {adminView ? (
                                                            <div className="price-admin-row">
                                                                <span className={estimateNum === null ? 'muted' : ''}>
                                                                    {estimateNum !== null ? estimateNum.toLocaleString() : ''}
                                                                </span>

                                                                {percentDiff !== null && (
                                                                    <span className="inventory-percent" style={{ color: color }}>
                                                                        ({percentDiff > 0 ? '+' : ''}{percentDiff}%)
                                                                    </span>
                                                                )}

                                                                <input
                                                                    className="price-input"
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    pattern="[0-9]*"
                                                                    value={
                                                                        typeof adminPriceEdits[id] !== 'undefined'
                                                                            ? adminPriceEdits[id]
                                                                            : (typeof item.item_price !== 'undefined' ? String(item.item_price) : (prices && prices[id] && typeof prices[id] === 'object' && prices[id].price !== undefined ? String(prices[id].price) : ''))
                                                                    }
                                                                    onChange={(e) => {
                                                                        e.stopPropagation();
                                                                        handlePriceEdit(id, e.target.value);
                                                                    }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />


                                                            </div>
                                                        ) : (
                                                            // Non-admin: show authoritative prices.json value (no percent)
                                                            <>{highlightText(priceStr)}</>
                                                        )}
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
                                                                className="item-img"
                                                            />
                                                            {highlightText(
                                                                `${item.name}${Number(item.quantity) > 1 ? ` x${item.quantity}` : ''}`,
                                                            )}
                                                        </>
                                                    ) : key === 'item_sub_type' && typeof item[key] === 'string' ? (
                                                        highlightText(
                                                            item[key].replace(/^Equipment/, '').replace(/^\s+/, ''),
                                                        )
                                                    ) : (
                                                        highlightText(item[key])
                                                    )}
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
                            <span className="pss-tooltip-text">
                                <strong>Item ID:</strong>{' '}
                                <span className="monospace">{sorted[hoveredRow].item_id}</span>
                            </span>
                        )}
                    </Tooltip>
                </div>
            </>
        );
    }

    return (
        <div className="container">
            <h1>Inventory</h1>
            <pre>{JSON.stringify(inventory, null, 2)}</pre>
        </div>
    );
}
export default App;
