import { useCallback, useEffect, useMemo, useReducer } from 'react'
import * as userApi from '../api/userApi'

type State = {
  users: userApi.User[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  error: string
  filters: {
    search: string
    roleId: string
    isActive: string
  }
}

type Action =
  | { type: 'setLoading'; payload: boolean }
  | { type: 'setError'; payload: string }
  | { type: 'setData'; payload: { users: userApi.User[]; total: number; page: number } }
  | { type: 'setPage'; payload: number }
  | { type: 'setFilters'; payload: Partial<State['filters']> }

const initialState: State = {
  users: [],
  total: 0,
  page: 1,
  pageSize: 10,
  loading: false,
  error: '',
  filters: {
    search: '',
    roleId: '',
    isActive: '',
  },
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'setLoading':
      return { ...state, loading: action.payload }
    case 'setError':
      return { ...state, error: action.payload }
    case 'setData':
      return { ...state, users: action.payload.users, total: action.payload.total, page: action.payload.page }
    case 'setPage':
      return { ...state, page: action.payload }
    case 'setFilters':
      return { ...state, filters: { ...state.filters, ...action.payload }, page: 1 }
    default:
      return state
  }
}

export function useUsers() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const fetchUsers = useCallback(async (override?: Partial<{ page: number }>) => {
    dispatch({ type: 'setLoading', payload: true })
    dispatch({ type: 'setError', payload: '' })

    try {
      const nextPage = override?.page || state.page
      const response = await userApi.getAllUsers({
        page: nextPage,
        pageSize: state.pageSize,
        search: state.filters.search,
        roleId: state.filters.roleId,
        isActive: state.filters.isActive,
      })
      dispatch({
        type: 'setData',
        payload: { users: response.data, total: response.total, page: response.page },
      })
    } catch (error) {
      dispatch({ type: 'setError', payload: error instanceof Error ? error.message : 'Failed to fetch users' })
    } finally {
      dispatch({ type: 'setLoading', payload: false })
    }
  }, [state.filters.isActive, state.filters.roleId, state.filters.search, state.page, state.pageSize])

  const createUser = useCallback(async (payload: userApi.CreateUserPayload) => {
    await userApi.createUser(payload)
    await fetchUsers({ page: 1 })
  }, [fetchUsers])

  const getUserById = useCallback(async (id: string) => {
    return userApi.getUserById(id)
  }, [])

  const updateUser = useCallback(async (id: string, payload: userApi.UpdateUserPayload) => {
    await userApi.updateUser(id, payload)
    await fetchUsers()
  }, [fetchUsers])

  const deactivateUser = useCallback(async (id: string) => {
    await userApi.deactivateUser(id)
    await fetchUsers()
  }, [fetchUsers])

  const changeRole = useCallback(async (id: string, roleId: number) => {
    await userApi.changeUserRole(id, roleId)
    await fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(state.total / state.pageSize)), [state.pageSize, state.total])

  return {
    ...state,
    totalPages,
    setPage: (page: number) => dispatch({ type: 'setPage', payload: page }),
    setFilters: (filters: Partial<State['filters']>) => dispatch({ type: 'setFilters', payload: filters }),
    fetchUsers,
    getUserById,
    createUser,
    updateUser,
    deactivateUser,
    changeRole,
  }
}
