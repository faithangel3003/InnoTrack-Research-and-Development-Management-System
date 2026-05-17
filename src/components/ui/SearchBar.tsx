import { Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'

type SearchBarProps = {
  placeholder?: string
  onSearch: (value: string) => void
  debounceMs?: number
  initialValue?: string
}

export function SearchBar({ placeholder = 'Search...', onSearch, debounceMs = 400, initialValue = '' }: SearchBarProps) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    const id = window.setTimeout(() => {
      onSearch(value)
    }, debounceMs)

    return () => window.clearTimeout(id)
  }, [debounceMs, onSearch, value])

  return (
    <div className="flex min-h-[3rem] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700 transition focus-within:border-sky-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-100">
      <Search size={16} className="text-slate-400" />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="w-full border-none bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
      />
      {value ? (
        <button type="button" onClick={() => setValue('')} className="text-slate-400 transition hover:text-slate-700">
          <X size={14} />
        </button>
      ) : null}
    </div>
  )
}
