import axios from 'axios'
import toast from 'react-hot-toast'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5110/api'

export const axiosInstance = axios.create({
  baseURL,
  timeout: 15000,
})

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('innotrack_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const hasActiveSession = Boolean(localStorage.getItem('innotrack_token'))
    const responseData = error?.response?.data
    const hasResponseMessage = Boolean(
      (typeof responseData === 'string' && responseData.trim())
      || (responseData && typeof responseData === 'object' && typeof responseData.message === 'string' && responseData.message.trim()),
    )

    if (status === 401 && hasActiveSession) {
      localStorage.removeItem('innotrack_token')
      localStorage.removeItem('innotrack_user')
      window.dispatchEvent(new CustomEvent('innotrack:auth-expired'))
    } else if (status === 403 && !hasResponseMessage) {
      toast.error('Access denied')
    } else if (status === 429) {
      toast.error('Too many requests, please slow down')
    } else if (status && status >= 500) {
      toast.error('Server error occurred')
    } else if (!error?.response) {
      toast.error('Cannot connect to server')
    }

    return Promise.reject(error)
  },
)
