"use client";

import { ReactNode } from "react";

interface Column<T> {
    header: string;
    accessorKey: keyof T;
    cell?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    onRowClick?: (item: T) => void;
    selectable?: boolean;
    selectedIds?: Set<string>;
    onSelectionChange?: (ids: Set<string>) => void;
    idAccessor?: keyof T;
}

export default function DataTable<T>({
    data,
    columns,
    onRowClick,
    selectable = false,
    selectedIds,
    onSelectionChange,
    idAccessor = "id" as keyof T,
}: DataTableProps<T>) {
    if (!data || data.length === 0) {
        return (
            <div className="w-full h-32 flex items-center justify-center border-t border-border-light text-[14px] text-text-tertiary">
                Brak danych do wyświetlenia.
            </div>
        );
    }

    const allIds = data.map((row) => String(row[idAccessor]));
    const allSelected = selectable && selectedIds ? allIds.every((id) => selectedIds.has(id)) : false;

    const toggleAll = () => {
        if (!onSelectionChange) return;
        if (allSelected) {
            onSelectionChange(new Set());
        } else {
            onSelectionChange(new Set(allIds));
        }
    };

    const toggleRow = (id: string) => {
        if (!onSelectionChange || !selectedIds) return;
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        onSelectionChange(next);
    };

    return (
        <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr>
                        {selectable && (
                            <th className="w-10 px-3 py-3 border-b border-border bg-bg-surface text-center">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={toggleAll}
                                    className="accent-accent w-4 h-4 cursor-pointer"
                                />
                            </th>
                        )}
                        {columns.map((col, i) => (
                            <th
                                key={i}
                                className="px-6 py-3 border-b border-border bg-bg-surface text-[12px] font-semibold tracking-wider uppercase text-text-tertiary whitespace-nowrap"
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-transparent">
                    {data.map((row, rowIndex) => {
                        const rowId = String(row[idAccessor]);
                        const isSelected = selectable && selectedIds?.has(rowId);

                        return (
                            <tr
                                key={rowIndex}
                                onClick={() => onRowClick && onRowClick(row)}
                                className={`
                                    border-b border-border-light last:border-0 hover:bg-bg-surface-2 transition-colors
                                    ${onRowClick ? "cursor-pointer" : ""}
                                    ${isSelected ? "bg-accent/5" : ""}
                                `}
                            >
                                {selectable && (
                                    <td className="w-10 px-3 py-4 text-center">
                                        <input
                                            type="checkbox"
                                            checked={!!isSelected}
                                            onChange={() => toggleRow(rowId)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="accent-accent w-4 h-4 cursor-pointer"
                                        />
                                    </td>
                                )}
                                {columns.map((col, colIndex) => (
                                    <td
                                        key={colIndex}
                                        className="px-6 py-4 text-[14px] text-text-primary whitespace-nowrap"
                                    >
                                        {col.cell ? col.cell(row) : (row[col.accessorKey] as ReactNode)}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
