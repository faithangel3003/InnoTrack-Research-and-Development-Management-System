import { useCallback, useEffect, useMemo, useReducer } from 'react'
import * as auditLogApi from '../api/auditLogApi'

type State = {
  logs: auditLogApi.AuditLog[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  error: string
  filters: {
    userId: string
    startDate: string
    endDate: string
  }
}

type Action =
  | { type: 'setLoading'; payload: boolean }
  | { type: 'setError'; payload: string }
  | { type: 'setData'; payload: { logs: auditLogApi.AuditLog[]; total: number; page: number } }
  | { type: 'setPage'; payload: number }
  | { type: 'setFilters'; payload: Partial<State['filters']> }

const initialState: State = {
  logs: [],
  total: 0,
  page: 1,
  pageSize: 20,
  loading: false,
  error: '',
  filters: {
    userId: '',
    startDate: '',
    endDate: '',
  },
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'setLoading':
      return { ...state, loading: action.payload }
    case 'setError':
      return { ...state, error: action.payload }
    case 'setData':
      return { ...state, logs: action.payload.logs, total: action.payload.total, page: action.payload.page }
    case 'setPage':
      return { ...state, page: action.payload }
    case 'setFilters':
      return { ...state, filters: { ...state.filters, ...action.payload }, page: 1 }
    default:
      return state
  }
}

export function useAuditLogs() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const fetchLogs = useCallback(async (override?: { page?: number }) => {
    dispatch({ type: 'setLoading', payload: true })
    dispatch({ type: 'setError', payload: '' })

    try {
      const page = override?.page || state.page
      const response = await auditLogApi.getAuditLogs({
        page,
        pageSize: state.pageSize,
        userId: state.filters.userId || undefined,
        startDate: state.filters.startDate || undefined,
        endDate: state.filters.endDate || undefined,
      })

      dispatch({ type: 'setData', payload: { logs: response.data, total: response.total, page: response.page } })
    } catch (error) {
      dispatch({ type: 'setError', payload: error instanceof Error ? error.message : 'Failed to fetch logs' })
    } finally {
      dispatch({ type: 'setLoading', payload: false })
    }
  }, [state.filters.endDate, state.filters.startDate, state.filters.userId, state.page, state.pageSize])

  const fetchLogsByUser = useCallback(async (userId: string, page = 1) => {
    dispatch({ type: 'setLoading', payload: true })
    dispatch({ type: 'setError', payload: '' })

    try {
      const response = await auditLogApi.getAuditLogsByUser(userId, { page, pageSize: state.pageSize })
      dispatch({ type: 'setData', payload: { logs: response.data, total: response.total, page: response.page } })
    } catch (error) {
      dispatch({ type: 'setError', payload: error instanceof Error ? error.message : 'Failed to fetch logs by user' })
    } finally {
      dispatch({ type: 'setLoading', payload: false })
    }
  }, [state.pageSize])

  useEffect(() => {
    void fetchLogs()
  }, [fetchLogs])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(state.total / state.pageSize)), [state.pageSize, state.total])

  return {
    ...state,
    totalPages,
    setPage: (page: number) => dispatch({ type: 'setPage', payload: page }),
    setFilters: (filters: Partial<State['filters']>) => dispatch({ type: 'setFilters', payload: filters }),
    fetchLogs,
    fetchLogsByUser,
  }
}
