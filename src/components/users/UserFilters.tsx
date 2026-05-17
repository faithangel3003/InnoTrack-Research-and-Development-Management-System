import { useMemo, type ReactNode } from 'react'
import type { Role } from '../../api/roleApi'
import { SearchBar } from '../ui/SearchBar'
import { Select } from '../ui/Select'

type UserFiltersProps = {
  roles: Role[]
  filters: { search: string; roleId: string; isActive: string }
  onChange: (filters: Partial<{ search: string; roleId: string; isActive: string }>) => void
  actions?: ReactNode
}

export function UserFilters({ roles, filters, onChange, actions }: UserFiltersProps) {
  const roleOptions = useMemo(
    () => [{ value: '', label: 'All Roles' }, ...roles.map((role) => ({ value: String(role.id), label: role.roleName }))],
    [roles],
  )

  return (
    <div className="grid gap-3 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.04)] xl:grid-cols-[minmax(0,1.4fr)_180px_180px_auto]">
      <SearchBar
        placeholder="Search users..."
        onSearch={(value) => onChange({ search: value })}
        initialValue={filters.search}
      />
      <Select
        options={roleOptions}
        value={filters.roleId}
        onChange={(event) => onChange({ roleId: event.target.value })}
      />
      <Select
        options={[
          { value: '', label: 'All Status' },
          { value: 'true', label: 'Active' },
          { value: 'false', label: 'Inactive' },
        ]}
        value={filters.isActive}
        onChange={(event) => onChange({ isActive: event.target.value })}
      />
      <div className="flex items-center justify-end gap-3">{actions}</div>
    </div>
  )
}
