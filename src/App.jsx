import { useEffect, useState, useRef } from 'react';

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
            tabIndex={0}
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

    useEffect(() => {
        // F1 toggles admin view, Escape clears search and tooltip
        const handleKeyDown = (e) => {
            if (e.key === 'F1' && !e.repeat) {
                e.preventDefault();
                console.log(`Toggling admin view to ${!adminView}`);
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

    // Build price mapping from current edits + inventory/prices
    const buildPricesMapping = (items) => {
        const out = {};
        items.forEach((item) => {
            const id = String(item.item_id);
            const edit = adminPriceEdits[id];
            let val;
            if (typeof edit !== 'undefined' && edit !== null && edit !== '') {
                const n = Number(edit);
                if (!isNaN(n)) val = n;
            } else if (typeof item.item_price !== 'undefined' && item.item_price !== null && item.item_price !== '') {
                const n = Number(item.item_price);
                if (!isNaN(n)) val = n;
            } else if (typeof prices[id] !== 'undefined') {
                const n = Number(prices[id]);
                if (!isNaN(n)) val = n;
            }
            if (typeof val !== 'undefined') out[id] = val;
        });
        return out;
    };

    // Download generated prices.json
    const downloadPricesJson = (items) => {
        const mapping = buildPricesMapping(items);
        const blob = new Blob([JSON.stringify(mapping, null, 4)], { type: 'application/json' });
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
                    // Sort by item_price if present, else prices.json
                    const aPrice =
                        typeof a.item_price !== 'undefined' ? Number(a.item_price) : Number(prices[a.item_id]);
                    const bPrice =
                        typeof b.item_price !== 'undefined' ? Number(b.item_price) : Number(prices[b.item_id]);
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
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                window.open(
                                                    `https://pixyship.com/item/${item.item_design_id}?activeTab=tab-players-sales`,
                                                    '_blank',
                                                    'noopener,noreferrer',
                                                );
                                            }
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
                                                const editVal = adminPriceEdits[id];
                                                const editNum =
                                                    typeof editVal !== 'undefined' && editVal !== null && editVal !== ''
                                                        ? Number(editVal)
                                                        : null;
                                                const inventoryNum =
                                                    typeof item.item_price !== 'undefined' && item.item_price !== null && item.item_price !== ''
                                                        ? Number(item.item_price)
                                                        : null;
                                                // When not in admin view prefer prices.json (the authoritative export file).
                                                let basePriceNum;
                                                if (adminView) {
                                                    // In admin mode: edits override inventory, then prices.json
                                                    basePriceNum =
                                                        editNum !== null
                                                            ? editNum
                                                            : !isNaN(Number(inventoryNum))
                                                                ? inventoryNum
                                                                : !isNaN(Number(prices[id]))
                                                                    ? Number(prices[id])
                                                                    : null;
                                                } else {
                                                    // Non-admin view: prefer prices.json, fall back to inventory if missing
                                                    basePriceNum =
                                                        typeof prices[id] !== 'undefined' && !isNaN(Number(prices[id]))
                                                            ? Number(prices[id])
                                                            : !isNaN(Number(inventoryNum))
                                                                ? inventoryNum
                                                                : null;
                                                }

                                                const basePriceStr =
                                                    basePriceNum !== null ? basePriceNum.toLocaleString() : null;

                                                let estimate =
                                                    typeof item.pixyship_estimate !== 'undefined'
                                                        ? item.pixyship_estimate
                                                        : null;
                                                let estimateNum =
                                                    estimate && !isNaN(Number(estimate)) ? Number(estimate) : null;
                                                if (estimateNum !== null) {
                                                    estimate = estimateNum.toLocaleString();
                                                }
                                                let showEstimateOnly = basePriceNum === null && estimateNum !== null;

                                                // Color & percent diff use basePriceNum
                                                let color = '';
                                                let percentDiff = null;
                                                if (
                                                    adminView &&
                                                    basePriceNum !== null &&
                                                    estimateNum !== null
                                                ) {
                                                    let currentTheme = theme;
                                                    if (
                                                        currentTheme === 'dark' ||
                                                        (currentTheme === 'auto' &&
                                                            window.matchMedia('(prefers-color-scheme: dark)').matches)
                                                    ) {
                                                        color = basePriceNum <= estimateNum ? '#318741ff' : '#872b2bff';
                                                    } else {
                                                        color = basePriceNum <= estimateNum ? '#2c4a00ff' : '#330000ff';
                                                    }
                                                    percentDiff = (((basePriceNum - estimateNum) / estimateNum) * 100).toFixed(1);
                                                }

                                                // prepare inventory display (left side in admin): prefer item.item_price, fallback to prices.json
                                                const inventoryDisplayNum =
                                                    typeof item.item_price !== 'undefined' && item.item_price !== null && item.item_price !== ''
                                                        ? Number(item.item_price)
                                                        : null;
                                                const inventoryFallbackNum =
                                                    inventoryDisplayNum === null && typeof prices[id] !== 'undefined' && !isNaN(Number(prices[id]))
                                                        ? Number(prices[id])
                                                        : null;

                                                // compute percent diff based on inventory display (not admin override)
                                                const inventoryCompareNum = inventoryDisplayNum !== null ? inventoryDisplayNum : inventoryFallbackNum;
                                                let inventoryPercentDiff = null;
                                                let inventoryPercentColor = '';
                                                if (inventoryCompareNum !== null && estimateNum !== null) {
                                                    inventoryPercentDiff = (((inventoryCompareNum - estimateNum) / estimateNum) * 100).toFixed(1);
                                                    let currentTheme = theme;
                                                    if (
                                                        currentTheme === 'dark' ||
                                                        (currentTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
                                                    ) {
                                                        inventoryPercentColor = inventoryCompareNum <= estimateNum ? '#318741ff' : '#872b2bff';
                                                    } else {
                                                        inventoryPercentColor = inventoryCompareNum <= estimateNum ? '#2c4a00ff' : '#330000ff';
                                                    }
                                                }

                                                return (
                                                    <td
                                                        key={key}
                                                        className="price-col"
                                                        title={estimate ? `Pixyship Estimate: ${estimate}` : undefined}
                                                        style={{ fontStyle: showEstimateOnly ? 'italic' : undefined, '--admin-price-color': adminView ? color : undefined }}
                                                    >
                                                        {adminView ? (
                                                            <div className="price-admin-row">
                                                                <span className={inventoryDisplayNum === null && estimateNum === null ? 'muted' : ''}>
                                                                    {adminView && estimateNum !== null
                                                                        ? estimateNum.toLocaleString()
                                                                        : (inventoryDisplayNum ?? inventoryFallbackNum ?? '')}
                                                                </span>

                                                                {inventoryPercentDiff !== null && (
                                                                    <span className="inventory-percent" style={{ '--inventory-percent-color': inventoryPercentColor }}>
                                                                        ({inventoryPercentDiff > 0 ? '+' : ''}
                                                                        {inventoryPercentDiff}%)
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
                                                                            : (typeof prices[id] !== 'undefined' ? String(prices[id]) : (typeof item.item_price !== 'undefined' ? String(item.item_price) : ''))
                                                                    }
                                                                    onChange={(e) => {
                                                                        e.stopPropagation();
                                                                        handlePriceEdit(id, e.target.value);
                                                                    }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            </div>
                                                        ) : (
                                                            // Non-admin: show only prices.json value (no pixyship estimate)
                                                            <>{highlightText(prices[id] ? String(prices[id]) : '')}</>
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
