"use client";

import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type IndexedGridProps = {
  /** Valores iniciales opcionales */
  initialRows?: number;
  initialColumns?: number;
};

const MIN = 1;
const MAX = 50;
const STORAGE_KEY = "helper-crossword:indexed-grid:v1";

function clamp(n: number): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) return MIN;
  return Math.min(MAX, Math.max(MIN, Math.floor(n)));
}

/** Una letra (incl. acentos y ñ); sin depender de \p{L} por compatibilidad TS. */
const LETTER_RE = /^[A-Za-z\u00C0-\u024F]$/;

/** Texto tipo objeto con índices numéricos sin comillas (JSON no lo permite). */
function formatIndexLetterMap(
  lettersByIndex: Record<number, string>,
  sortedIndexes: number[]
): string {
  if (sortedIndexes.length === 0) return "{}";
  const inner = sortedIndexes
    .map((idx) => `${idx}: ${JSON.stringify(lettersByIndex[idx])}`)
    .join(", ");
  return `{ ${inner} }`;
}

type PersistedGrid = {
  rows: number;
  columns: number;
  letters: Record<number, string>;
};

export function IndexedGrid({
  initialRows = 10,
  initialColumns = 10,
}: IndexedGridProps) {
  const [rows, setRows] = useState(() => clamp(initialRows));
  const [columns, setColumns] = useState(() => clamp(initialColumns));
  const [letters, setLetters] = useState<Record<number, string>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLettersMapModalOpen, setIsLettersMapModalOpen] = useState(false);
  const [isSelectedIndexesModalOpen, setIsSelectedIndexesModalOpen] =
    useState(false);
  const [isSelectedLettersMapModalOpen, setIsSelectedLettersMapModalOpen] =
    useState(false);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const total = rows * columns;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<PersistedGrid>;
      if (typeof parsed.rows === "number") setRows(clamp(parsed.rows));
      if (typeof parsed.columns === "number") setColumns(clamp(parsed.columns));

      if (parsed.letters && typeof parsed.letters === "object") {
        const next: Record<number, string> = {};
        for (const [key, value] of Object.entries(parsed.letters)) {
          const idx = Number(key);
          if (
            Number.isInteger(idx) &&
            idx >= 0 &&
            typeof value === "string" &&
            LETTER_RE.test(value)
          ) {
            next[idx] = value.toUpperCase();
          }
        }
        setLetters(next);
      }
    } catch {
      // Ignorar estado corrupto y usar valores por defecto.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setLetters((prev) => {
      const next: Record<number, string> = {};
      for (const [key, value] of Object.entries(prev)) {
        const i = Number(key);
        if (i < total && value) next[i] = value;
      }
      return next;
    });
    setSelectedIndexes((prev) => prev.filter((index) => index < total));
    inputRefs.current.length = total;
  }, [total, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const payload: PersistedGrid = { rows, columns, letters };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [rows, columns, letters, hydrated]);

  const handleRowsChange = (value: number) => {
    if (Number.isNaN(value)) return;
    setRows(clamp(value));
  };

  const handleColumnsChange = (value: number) => {
    if (Number.isNaN(value)) return;
    setColumns(clamp(value));
  };

  const focusCell = useCallback((index: number) => {
    const el = inputRefs.current[index];
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  const cells = useMemo(() => {
    return Array.from({ length: total }, (_, i) => i);
  }, [total]);

  const filledIndexes = useMemo(() => {
    return Object.keys(letters)
      .map(Number)
      .filter((idx) => Number.isInteger(idx) && idx >= 0)
      .sort((a, b) => a - b);
  }, [letters]);

  /** Solo celdas con letra: clave = índice, valor = letra (ordenado por índice). */
  const lettersByIndex = useMemo(() => {
    const out: Record<number, string> = {};
    for (const idx of filledIndexes) {
      const ch = letters[idx];
      if (ch) out[idx] = ch;
    }
    return out;
  }, [letters, filledIndexes]);

  const lettersMapDisplay = useMemo(
    () => formatIndexLetterMap(lettersByIndex, filledIndexes),
    [lettersByIndex, filledIndexes]
  );

  const selectedIndexesSet = useMemo(() => {
    return new Set(selectedIndexes);
  }, [selectedIndexes]);

  /** Índice seleccionado → letra en esa celda (vacío si no hay letra). */
  const lettersBySelectedIndex = useMemo(() => {
    const out: Record<number, string> = {};
    for (const idx of selectedIndexes) {
      out[idx] = letters[idx] ?? "";
    }
    return out;
  }, [letters, selectedIndexes]);

  const selectedLettersMapDisplay = useMemo(
    () => formatIndexLetterMap(lettersBySelectedIndex, selectedIndexes),
    [lettersBySelectedIndex, selectedIndexes]
  );

  const handleLetterChange = (index: number, raw: string) => {
    if (raw === "") {
      setLetters((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      return;
    }
    const ch = raw.slice(-1);
    if (!LETTER_RE.test(ch)) return;
    setLetters((prev) => ({ ...prev, [index]: ch.toUpperCase() }));
  };

  const handleToggleSelectedIndex = (index: number) => {
    setSelectedIndexes((prev) => {
      if (prev.includes(index)) {
        return prev.filter((value) => value !== index);
      }

      return [...prev, index].sort((a, b) => a - b);
    });
  };

  const handleCellKeyDown = (
    index: number,
    e: KeyboardEvent<HTMLInputElement>
  ) => {
    const col = index % columns;
    const row = Math.floor(index / columns);

    if (e.key === "ArrowRight" && col < columns - 1) {
      e.preventDefault();
      focusCell(index + 1);
    } else if (e.key === "ArrowLeft" && col > 0) {
      e.preventDefault();
      focusCell(index - 1);
    } else if (e.key === "ArrowDown" && row < rows - 1) {
      e.preventDefault();
      focusCell(index + columns);
    } else if (e.key === "ArrowUp" && row > 0) {
      e.preventDefault();
      focusCell(index - columns);
    } else if (e.key === "Backspace" && letters[index] === undefined) {
      if (col > 0) {
        e.preventDefault();
        focusCell(index - 1);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Filas
          <input
            type="number"
            min={MIN}
            max={MAX}
            value={rows}
            onChange={(e) => handleRowsChange(e.currentTarget.valueAsNumber)}
            className="w-24 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-neutral-900 shadow-sm dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Columnas
          <input
            type="number"
            min={MIN}
            max={MAX}
            value={columns}
            onChange={(e) =>
              handleColumnsChange(e.currentTarget.valueAsNumber)
            }
            className="w-24 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-neutral-900 shadow-sm dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </label>
        <button
          type="button"
          onClick={() => setLetters({})}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          Limpiar letras
        </button>
        <button
          type="button"
          onClick={() => setSelectedIndexes([])}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          Limpiar seleccionados
        </button>
      </div>

      <div
        className="inline-grid gap-px rounded-lg border border-neutral-400 bg-neutral-400 p-px shadow-sm dark:border-neutral-600 dark:bg-neutral-600"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(2rem, 1fr))`,
        }}
      >
        { cells.map((index) => (
          <div
            key={index}
            className={`relative flex min-h-[2.75rem] min-w-[2.75rem] flex-col ${
              selectedIndexesSet.has(index)
                ? "bg-amber-200 dark:bg-amber-700/60"
                : "bg-white dark:bg-neutral-950"
            }`}
          >
            <span
              className="pointer-events-none absolute left-1 top-0.5 text-[12px] leading-none tabular-nums text-neutral-400 dark:text-neutral-500"
              aria-hidden
            >
              {index}
            </span>
            <input
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={1}
              aria-label={`Celda ${index}`}
              value={letters[index] ?? ""}
              onChange={(e) => handleLetterChange(index, e.target.value)}
              onDoubleClick={() => handleToggleSelectedIndex(index)}
              onKeyDown={(e) => handleCellKeyDown(index, e)}
              className={`h-full min-h-[2.75rem] w-full border-0 bg-transparent pt-3 text-center text-lg font-semibold uppercase tracking-wide text-neutral-900 outline-none ring-inset focus:ring-2 dark:text-neutral-100 ${
                selectedIndexesSet.has(index)
                  ? "ring-1 ring-amber-500 focus:ring-amber-500 dark:ring-amber-400 dark:focus:ring-amber-400"
                  : "ring-transparent focus:ring-neutral-400 dark:focus:ring-neutral-500"
              }`}
            />
          </div>
        )) }
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setIsLettersMapModalOpen(true)}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          Ver objeto answerCorrect
        </button>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          Ver todos los indices con letras
        </button>
        <button
          type="button"
          onClick={() => setIsSelectedIndexesModalOpen(true)}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          Ver indices seleccionados
        </button>
        <button
          type="button"
          onClick={() => setIsSelectedLettersMapModalOpen(true)}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          Ver objeto letras seleccionadas
        </button>
      </div>

      {  isLettersMapModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg border border-neutral-300 bg-white p-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Letras por indice
              </h2>
              <button
                type="button"
                onClick={() => setIsLettersMapModalOpen(false)}
                className="rounded-md border border-neutral-300 px-2 py-1 text-sm text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Cerrar
              </button>
            </div>
            <pre className="max-h-[min(70vh,32rem)] overflow-y-auto overflow-x-hidden rounded-md bg-neutral-100 p-3 text-sm text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100 whitespace-pre-wrap break-words">
              {lettersMapDisplay}
            </pre>
          </div>
        </div>
      ) : null }

      { isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg border border-neutral-300 bg-white p-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Indices con letra
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-md border border-neutral-300 px-2 py-1 text-sm text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Cerrar
              </button>
            </div>
            <pre className="max-h-[min(70vh,32rem)] overflow-y-auto overflow-x-hidden rounded-md bg-neutral-100 p-3 text-sm text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100 whitespace-pre-wrap break-all font-mono">
              {JSON.stringify(filledIndexes)}
            </pre>
          </div>
        </div>
      ) : null }

      { isSelectedIndexesModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg border border-neutral-300 bg-white p-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Indices seleccionados
              </h2>
              <button
                type="button"
                onClick={() => setIsSelectedIndexesModalOpen(false)}
                className="rounded-md border border-neutral-300 px-2 py-1 text-sm text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Cerrar
              </button>
            </div>
            <pre className="max-h-[min(70vh,32rem)] overflow-y-auto overflow-x-hidden rounded-md bg-neutral-100 p-3 text-sm text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100 whitespace-pre-wrap break-all font-mono">
              {JSON.stringify(selectedIndexes)}
            </pre>
          </div>
        </div>
      ) : null }

      { isSelectedLettersMapModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg border border-neutral-300 bg-white p-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Letras por indice (solo seleccionadas)
              </h2>
              <button
                type="button"
                onClick={() => setIsSelectedLettersMapModalOpen(false)}
                className="rounded-md border border-neutral-300 px-2 py-1 text-sm text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Cerrar
              </button>
            </div>
            <pre className="max-h-[min(70vh,32rem)] overflow-y-auto overflow-x-hidden rounded-md bg-neutral-100 p-3 text-sm text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100 whitespace-pre-wrap break-words">
              {selectedLettersMapDisplay}
            </pre>
          </div>
        </div>
      ) : null }
    </div>
  );
}
