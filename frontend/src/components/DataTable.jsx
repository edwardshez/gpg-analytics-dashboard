import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search, Download } from 'lucide-react'

export default function DataTable({
    columns,
    data,
    title,
    searchable = true,
    pagination = true,
    rowsPerPage = 10,
    onRowClick
}) {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)

    // Filter data
    const filteredData = useMemo(() => {
        if (!searchTerm) return data
        return data.filter(item =>
            Object.values(item).some(val =>
                String(val).toLowerCase().includes(searchTerm.toLowerCase())
            )
        )
    }, [data, searchTerm])

    // Sort data
    const sortedData = useMemo(() => {
        if (!sortConfig.key) return filteredData

        return [...filteredData].sort((a, b) => {
            const aVal = a[sortConfig.key]
            const bVal = b[sortConfig.key]

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
            return 0
        })
    }, [filteredData, sortConfig])

    // Paginate data
    const paginatedData = useMemo(() => {
        if (!pagination) return sortedData
        const startIndex = (currentPage - 1) * rowsPerPage
        return sortedData.slice(startIndex, startIndex + rowsPerPage)
    }, [sortedData, currentPage, pagination, rowsPerPage])

    const totalPages = Math.ceil(filteredData.length / rowsPerPage)

    const requestSort = (key) => {
        let direction = 'asc'
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const exportToCSV = () => {
        const headers = columns.map(col => col.header).join(',')
        const rows = filteredData.map(item =>
            columns.map(col => {
                const val = item[col.key] || ''
                // Handle objects/arrays for CSV (like in Anomalies)
                const displayVal = col.render && typeof col.render(item) === 'string' ? col.render(item) : val
                return typeof displayVal === 'string' ? `"${displayVal.replace(/"/g, '""')}"` : displayVal
            }).join(',')
        )
        const csvContent = [headers, ...rows].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}_export.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="glass-card overflow-hidden animate-fade-in flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-gpg-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold text-gpg-text-primary">{title}</h3>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gpg-surface hover:bg-gpg-surface-hover border border-gpg-border rounded-lg text-xs font-semibold text-gpg-text-secondary hover:text-gpg-text-primary transition-all group"
                        title="Export filtered data to CSV"
                    >
                        <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
                        Export CSV
                    </button>
                </div>

                {searchable && (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gpg-text-secondary/40" size={16} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value)
                                setCurrentPage(1)
                            }}
                            className="bg-gpg-blue/50 border border-gpg-border rounded-lg pl-10 pr-4 py-2 text-sm text-gpg-text-primary placeholder-gpg-text-secondary/30 focus:outline-none focus:border-gpg-gold/50 w-full sm:w-64 transition-colors"
                        />
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gpg-surface text-gpg-text-secondary text-xs uppercase tracking-wider">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={`px-6 py-3 font-semibold ${col.sortable ? 'cursor-pointer hover:text-gpg-text-primary transition-colors select-none' : ''} ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                                    onClick={() => col.sortable && requestSort(col.key)}
                                >
                                    <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                                        {col.header}
                                        {col.sortable && sortConfig.key === col.key && (
                                            sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gpg-border/30">
                        {paginatedData.length > 0 ? (
                            paginatedData.map((row, i) => (
                                <tr
                                    key={row.id || i}
                                    onClick={() => onRowClick && onRowClick(row)}
                                    className={`hover:bg-gpg-surface transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                                >
                                    {columns.map((col) => (
                                        <td key={col.key} className={`px-6 py-4 whitespace-nowrap text-gpg-text-primary ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                                            {col.render ? col.render(row) : row[col.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-12 text-center text-gpg-text-secondary">
                                    No data found matching your query.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && totalPages > 1 && (
                <div className="p-4 border-t border-gpg-border flex items-center justify-between text-xs text-gpg-text-secondary">
                    <div>
                        Showing <span className="font-bold text-gpg-text-primary">{(currentPage - 1) * rowsPerPage + 1}</span> to <span className="font-bold text-gpg-text-primary">{Math.min(currentPage * rowsPerPage, filteredData.length)}</span> of <span className="font-bold text-gpg-text-primary">{filteredData.length}</span> entries
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-1 rounded hover:bg-gpg-surface disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="text-gpg-text-primary font-medium px-2">Page {currentPage} of {totalPages}</span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-1 rounded hover:bg-gpg-surface disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
