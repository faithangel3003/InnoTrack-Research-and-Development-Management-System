import { Archive, Download, Files, FolderTree, History, Plus, RefreshCw, SearchCode, ShieldCheck, Tags, Trash2, Upload } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as documentApi from '../../api/documentApi'
import * as projectApi from '../../api/projectApi'
import { AdminMetricCard } from '../../components/admin/AdminMetricCard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Pagination } from '../../components/ui/Pagination'
import { SearchBar } from '../../components/ui/SearchBar'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import { formatDate, relativeTime } from '../../utils/formatDate'
import { normalizeRole } from '../../utils/roleHelpers'

type UploadFormState = {
  title: string
  description: string
  references: string
  projectId: string
  categoryId: string
  file: File | null
}

type EditFormState = {
  title: string
  description: string
  references: string
  projectId: string
  categoryId: string
  tags: string
}

type VersionFormState = {
  changeNotes: string
  file: File | null
}

type CategoryFormState = {
  id: number | null
  name: string
  description: string
}

const emptyUploadForm: UploadFormState = {
  title: '',
  description: '',
  references: '',
  projectId: '',
  categoryId: '',
  file: null,
}

const emptyVersionForm: VersionFormState = {
  changeNotes: '',
  file: null,
}

const emptyCategoryForm: CategoryFormState = {
  id: null,
  name: '',
  description: '',
}

const textareaClassName = 'min-h-[8rem] w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700 transition focus:border-sky-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100'
const documentPageSize = 6

function parseTags(value: string) {
  const seen = new Set<string>()

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => {
      if (!entry) {
        return false
      }

      const normalized = entry.toLowerCase()
      if (seen.has(normalized)) {
        return false
      }

      seen.add(normalized)
      return true
    })
}

function addTagValue(currentValue: string, tagName: string) {
  return parseTags(`${currentValue},${tagName}`).join(', ')
}

function removeTagValue(currentValue: string, tagName: string) {
  const normalized = tagName.toLowerCase()

  return parseTags(currentValue)
    .filter((entry) => entry.toLowerCase() !== normalized)
    .join(', ')
}

function hasTagValue(currentValue: string, tagName: string) {
  const normalized = tagName.toLowerCase()
  return parseTags(currentValue).some((entry) => entry.toLowerCase() === normalized)
}

function formatBytes(bytes: number) {
  if (!bytes) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** unitIndex
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function saveBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(url)
}

function getStatusBadge(document: documentApi.DocumentItem | documentApi.DocumentDetail) {
  return document.isArchived
    ? { variant: 'warning' as const, text: 'Archived' }
    : { variant: 'success' as const, text: 'Active' }
}

export function ResearchDocumentationPage() {
  const toast = useToast()
  const { user } = useAuth()
  const role = normalizeRole(user?.role)
  const [searchParams] = useSearchParams()
  const focusedDocumentId = searchParams.get('documentId') || ''

  const [documents, setDocuments] = useState<documentApi.DocumentItem[]>([])
  const [categories, setCategories] = useState<documentApi.DocumentCategory[]>([])
  const [tags, setTags] = useState<documentApi.DocumentTag[]>([])
  const [projects, setProjects] = useState<projectApi.Project[]>([])
  const [selectedDocumentId, setSelectedDocumentId] = useState('')
  const [selectedDocument, setSelectedDocument] = useState<documentApi.DocumentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'archived'>('active')
  const [documentPage, setDocumentPage] = useState(1)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [versionOpen, setVersionOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [tagOpen, setTagOpen] = useState(false)
  const [editTagManagerOpen, setEditTagManagerOpen] = useState(false)
  const [uploadForm, setUploadForm] = useState<UploadFormState>(emptyUploadForm)
  const [editForm, setEditForm] = useState<EditFormState | null>(null)
  const [versionForm, setVersionForm] = useState<VersionFormState>(emptyVersionForm)
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm)
  const [tagForm, setTagForm] = useState({ name: '' })

  const canUpload = role === 'SystemAdmin' || role === 'ProjectManager' || role === 'TeamMember'
  const canManageTaxonomy = role === 'SuperAdmin' || role === 'SystemAdmin' || role === 'ProjectManager'
  const canDeleteTaxonomy = role === 'SuperAdmin' || role === 'SystemAdmin'
  const canViewAccessLogs = role !== 'TeamMember'
  const isDocumentOwner = selectedDocument?.uploadedByUserId === user?.id
  const canEditSelectedDocument = !!selectedDocument && (role === 'SystemAdmin' || role === 'ProjectManager' || (role === 'TeamMember' && isDocumentOwner))
  const canVersionSelectedDocument = canEditSelectedDocument
  const canArchiveSelectedDocument = !!selectedDocument && (role === 'ProjectManager' || role === 'SystemAdmin' || role === 'SuperAdmin')
  const canDeleteSelectedDocument = !!selectedDocument && (role === 'ProjectManager' || role === 'SystemAdmin' || role === 'SuperAdmin' || (role === 'TeamMember' && isDocumentOwner))

  const visibleDocuments = useMemo(() => {
    if (statusFilter === 'archived') {
      return documents.filter((entry) => entry.isArchived)
    }

    return documents
  }, [documents, statusFilter])

  const documentTotalPages = Math.max(1, Math.ceil(visibleDocuments.length / documentPageSize))

  useEffect(() => {
    setDocumentPage(1)
  }, [activeTagFilters, categoryFilter, projectFilter, search, statusFilter])

  useEffect(() => {
    if (documentPage > documentTotalPages) {
      setDocumentPage(documentTotalPages)
    }
  }, [documentPage, documentTotalPages])

  const paginatedDocuments = useMemo(
    () => visibleDocuments.slice((documentPage - 1) * documentPageSize, documentPage * documentPageSize),
    [documentPage, visibleDocuments],
  )

  const metrics = useMemo(() => ({
    totalDocuments: documents.length,
    archivedDocuments: documents.filter((entry) => entry.isArchived).length,
    categories: categories.length,
    versionedDocuments: documents.filter((entry) => entry.version > 1).length,
  }), [categories.length, documents])

  const loadMetadata = useCallback(async () => {
    const [categoryData, tagData, projectData] = await Promise.all([
      documentApi.getCategories(),
      documentApi.getTags(),
      projectApi.getAllProjects().catch(() => []),
    ])

    setCategories(categoryData)
    setTags(tagData)
    setProjects(projectData)
  }, [])

  const loadDocuments = useCallback(async () => {
    setLoading(true)

    try {
      const data = await documentApi.getDocuments({
        search: search || undefined,
        projectId: projectFilter || undefined,
        categoryId: categoryFilter ? Number(categoryFilter) : undefined,
        tags: activeTagFilters.length > 0 ? activeTagFilters : undefined,
        includeArchived: statusFilter !== 'active',
      })

      setDocuments(data)
      setError('')
    } catch (loadError) {
      setDocuments([])
      setError(loadError instanceof Error ? loadError.message : 'Failed to load document library')
    } finally {
      setLoading(false)
    }
  }, [activeTagFilters, categoryFilter, projectFilter, search, statusFilter])

  useEffect(() => {
    void loadMetadata()
  }, [loadMetadata])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  useEffect(() => {
    if (!focusedDocumentId) {
      return
    }

    setSearch('')
    setProjectFilter('')
    setCategoryFilter('')
    setActiveTagFilters([])
    setStatusFilter('all')
  }, [focusedDocumentId])

  useEffect(() => {
    if (!visibleDocuments.length) {
      setSelectedDocumentId('')
      setSelectedDocument(null)
      return
    }

    if (focusedDocumentId && visibleDocuments.some((entry) => entry.id === focusedDocumentId)) {
      setSelectedDocumentId(focusedDocumentId)
      return
    }

    if (!selectedDocumentId || !visibleDocuments.some((entry) => entry.id === selectedDocumentId)) {
      setSelectedDocumentId(visibleDocuments[0].id)
    }
  }, [focusedDocumentId, selectedDocumentId, visibleDocuments])

  useEffect(() => {
    if (!selectedDocumentId) {
      setSelectedDocument(null)
      return
    }

    let active = true

    async function loadDetail() {
      setDetailLoading(true)
      try {
        const data = await documentApi.getDocumentById(selectedDocumentId)
        if (!active) {
          return
        }

        setSelectedDocument(data)
      } catch (loadError) {
        if (!active) {
          return
        }

        setSelectedDocument(null)
        toast.error(loadError instanceof Error ? loadError.message : 'Failed to load document details')
      } finally {
        if (active) {
          setDetailLoading(false)
        }
      }
    }

    void loadDetail()

    return () => {
      active = false
    }
  }, [selectedDocumentId, toast])

  useEffect(() => {
    if (!focusedDocumentId || selectedDocumentId !== focusedDocumentId) {
      return
    }

    document.getElementById(`document-${focusedDocumentId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusedDocumentId, selectedDocumentId])

  useEffect(() => {
    if (!selectedDocumentId) {
      return
    }

    const selectedIndex = visibleDocuments.findIndex((entry) => entry.id === selectedDocumentId)
    if (selectedIndex === -1) {
      return
    }

    const nextPage = Math.floor(selectedIndex / documentPageSize) + 1
    if (nextPage !== documentPage) {
      setDocumentPage(nextPage)
    }
  }, [documentPage, selectedDocumentId, visibleDocuments])

  async function reloadAfterMutation(nextSelectedId?: string) {
    await Promise.all([loadDocuments(), loadMetadata()])
    if (nextSelectedId) {
      setSelectedDocumentId(nextSelectedId)
    }
  }

  function handleDocumentPageChange(nextPage: number) {
    setDocumentPage(nextPage)

    const nextDocuments = visibleDocuments.slice((nextPage - 1) * documentPageSize, nextPage * documentPageSize)
    if (nextDocuments.length > 0 && !nextDocuments.some((entry) => entry.id === selectedDocumentId)) {
      setSelectedDocumentId(nextDocuments[0].id)
    }
  }

  function toggleTagFilter(tag: string) {
    setActiveTagFilters((current) => current.includes(tag) ? current.filter((entry) => entry !== tag) : [...current, tag])
  }

  function openCreateCategory() {
    setCategoryForm(emptyCategoryForm)
    setCategoryOpen(true)
  }

  function openEditCategory(category: documentApi.DocumentCategory) {
    setCategoryForm({
      id: category.id,
      name: category.name,
      description: category.description || '',
    })
    setCategoryOpen(true)
  }

  function openEditTagManager() {
    setTagForm({ name: '' })
    setEditTagManagerOpen(true)
  }

  function closeEditTagManager() {
    setEditTagManagerOpen(false)
    setTagForm({ name: '' })
  }

  function closeEditInlineManagers() {
    closeEditTagManager()
  }

  function upsertCategoryState(category: documentApi.DocumentCategory) {
    setCategories((current) => [...current.filter((entry) => entry.id !== category.id), category].sort((left, right) => left.name.localeCompare(right.name)))
    setDocuments((current) => current.map((entry) => entry.categoryId === category.id ? { ...entry, categoryName: category.name } : entry))
    setSelectedDocument((current) => current && current.categoryId === category.id ? { ...current, categoryName: category.name } : current)
  }

  function removeCategoryState(category: documentApi.DocumentCategory) {
    setCategories((current) => current.filter((entry) => entry.id !== category.id))
    setDocuments((current) => current.map((entry) => entry.categoryId === category.id ? { ...entry, categoryId: null, categoryName: null } : entry))
    setSelectedDocument((current) => current && current.categoryId === category.id ? { ...current, categoryId: null, categoryName: null } : current)
  }

  function upsertTagState(tag: documentApi.DocumentTag) {
    setTags((current) => [...current.filter((entry) => entry.id !== tag.id), tag].sort((left, right) => left.name.localeCompare(right.name)))
  }

  function removeTagState(tag: documentApi.DocumentTag) {
    setTags((current) => current.filter((entry) => entry.id !== tag.id))
    setActiveTagFilters((current) => current.filter((entry) => entry.toLowerCase() !== tag.name.toLowerCase()))
    setEditForm((current) => current && hasTagValue(current.tags, tag.name) ? { ...current, tags: removeTagValue(current.tags, tag.name) } : current)
    setDocuments((current) => current.map((entry) => entry.tags.some((value) => value.toLowerCase() === tag.name.toLowerCase()) ? { ...entry, tags: entry.tags.filter((value) => value.toLowerCase() !== tag.name.toLowerCase()) } : entry))
    setSelectedDocument((current) => current && current.tags.some((value) => value.toLowerCase() === tag.name.toLowerCase()) ? { ...current, tags: current.tags.filter((value) => value.toLowerCase() !== tag.name.toLowerCase()) } : current)
  }

  function toggleEditTag(tagName: string) {
    setEditForm((current) => current ? {
      ...current,
      tags: hasTagValue(current.tags, tagName) ? removeTagValue(current.tags, tagName) : addTagValue(current.tags, tagName),
    } : current)
  }

  async function handleDownload(documentId: string, fallbackFileName: string) {
    const toastId = toast.loading('Preparing download...')

    try {
      const payload = await documentApi.downloadDocument(documentId, fallbackFileName)
      saveBlob(payload.blob, payload.fileName)
      toast.dismiss(toastId)
      toast.success('Document downloaded')
    } catch (downloadError) {
      toast.dismiss(toastId)
      toast.error(downloadError instanceof Error ? downloadError.message : 'Failed to download document')
    }
  }

  async function handleVersionDownload(versionNumber: number, fallbackFileName: string) {
    if (!selectedDocument) {
      return
    }

    const toastId = toast.loading('Preparing version download...')

    try {
      const payload = await documentApi.downloadDocumentVersion(selectedDocument.id, versionNumber, fallbackFileName)
      saveBlob(payload.blob, payload.fileName)
      toast.dismiss(toastId)
      toast.success(`Version ${versionNumber} downloaded`)
    } catch (downloadError) {
      toast.dismiss(toastId)
      toast.error(downloadError instanceof Error ? downloadError.message : 'Failed to download selected version')
    }
  }

  async function submitUpload() {
    if (!uploadForm.file) {
      toast.error('Select a file to upload')
      return
    }

    const formData = new FormData()
    formData.append('Title', uploadForm.title)
    formData.append('Description', uploadForm.description)
    formData.append('References', uploadForm.references)
    if (uploadForm.projectId) {
      formData.append('ProjectId', uploadForm.projectId)
    }
    if (uploadForm.categoryId) {
      formData.append('CategoryId', uploadForm.categoryId)
    }
    if (normalizeRole(user?.role) === 'SuperAdmin' && user?.organizationId) {
      formData.append('OrganizationId', user.organizationId)
    }
    formData.append('File', uploadForm.file)

    setSaving(true)
    try {
      const created = await documentApi.uploadDocument(formData)
      toast.success('Document uploaded successfully')
      setUploadOpen(false)
      setUploadForm(emptyUploadForm)
      setSelectedDocument(created)
      await reloadAfterMutation(created.id)
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Failed to upload document')
    } finally {
      setSaving(false)
    }
  }

  async function submitEdit() {
    if (!selectedDocument || !editForm) {
      return
    }

    setSaving(true)
    try {
      const updated = await documentApi.updateDocument(selectedDocument.id, {
        title: editForm.title,
        description: editForm.description,
        references: editForm.references,
        projectId: editForm.projectId || undefined,
        categoryId: editForm.categoryId ? Number(editForm.categoryId) : undefined,
        tags: parseTags(editForm.tags),
        isArchived: selectedDocument.isArchived,
      })

      toast.success('Document details updated')
      setEditOpen(false)
      setSelectedDocument(updated)
      await reloadAfterMutation(updated.id)
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Failed to update document')
    } finally {
      setSaving(false)
    }
  }

  async function handleArchiveDocument() {
    if (!selectedDocument) {
      return
    }

    setSaving(true)
    try {
      const updated = await documentApi.archiveDocument(selectedDocument.id)
      toast.success('Document archived')
      setSelectedDocument(updated)
      await reloadAfterMutation(updated.id)
    } catch (archiveError) {
      toast.error(archiveError instanceof Error ? archiveError.message : 'Failed to archive document')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteDocument() {
    if (!selectedDocument) {
      return
    }

    if (!window.confirm(`Delete "${selectedDocument.title}" and remove its stored files?`)) {
      return
    }

    setSaving(true)
    try {
      await documentApi.deleteDocument(selectedDocument.id)
      toast.success('Document deleted')
      setSelectedDocument(null)
      setSelectedDocumentId('')
      await reloadAfterMutation()
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Failed to delete document')
    } finally {
      setSaving(false)
    }
  }

  async function submitVersion() {
    if (!selectedDocument || !versionForm.file) {
      toast.error('Select a file for the new version')
      return
    }

    const formData = new FormData()
    formData.append('ChangeNotes', versionForm.changeNotes)
    formData.append('File', versionForm.file)

    setSaving(true)
    try {
      const updated = await documentApi.addDocumentVersion(selectedDocument.id, formData)
      toast.success('Document version uploaded')
      setVersionOpen(false)
      setVersionForm(emptyVersionForm)
      setSelectedDocument(updated)
      await reloadAfterMutation(updated.id)
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Failed to upload a new version')
    } finally {
      setSaving(false)
    }
  }

  async function submitCategory() {
    setSaving(true)
    try {
      let savedCategory: documentApi.DocumentCategory

      if (categoryForm.id) {
        savedCategory = await documentApi.updateCategory(categoryForm.id, {
          name: categoryForm.name,
          description: categoryForm.description || undefined,
          organizationId: normalizeRole(user?.role) === 'SuperAdmin' ? (user?.organizationId || undefined) : undefined,
        })
        toast.success('Document category updated')
      } else {
        savedCategory = await documentApi.createCategory({
          name: categoryForm.name,
          description: categoryForm.description || undefined,
          organizationId: normalizeRole(user?.role) === 'SuperAdmin' ? (user?.organizationId || undefined) : undefined,
        })
        toast.success('Document category created')
      }

      upsertCategoryState(savedCategory)
      setCategoryForm(emptyCategoryForm)
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteCategory(category: documentApi.DocumentCategory) {
    if (!window.confirm(`Delete category "${category.name}"? Documents linked to it will become uncategorized.`)) {
      return
    }

    setSaving(true)
    try {
      await documentApi.deleteCategory(category.id)
      toast.success('Document category deleted')
      removeCategoryState(category)
      if (categoryFilter === String(category.id)) {
        setCategoryFilter('')
      }
      if (categoryForm.id === category.id) {
        setCategoryForm(emptyCategoryForm)
      }
      setEditForm((current) => current && current.categoryId === String(category.id) ? { ...current, categoryId: '' } : current)
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Failed to delete category')
    } finally {
      setSaving(false)
    }
  }

  async function submitTag() {
    setSaving(true)
    try {
      const createdTag = await documentApi.createTag({
        name: tagForm.name,
        organizationId: normalizeRole(user?.role) === 'SuperAdmin' ? (user?.organizationId || undefined) : undefined,
      })

      upsertTagState(createdTag)
      if (editOpen && editTagManagerOpen) {
        setEditForm((current) => current ? { ...current, tags: addTagValue(current.tags, createdTag.name) } : current)
      }
      toast.success('Document tag created')
      setTagForm({ name: '' })
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Failed to create tag')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTag(tag: documentApi.DocumentTag) {
    if (!window.confirm(`Delete tag "${tag.name}"?`)) {
      return
    }

    setSaving(true)
    try {
      await documentApi.deleteTag(tag.id)
      toast.success('Document tag deleted')
      removeTagState(tag)
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Failed to delete tag')
    } finally {
      setSaving(false)
    }
  }

  function openEditDialog() {
    if (!selectedDocument) {
      return
    }

    closeEditInlineManagers()
    setEditForm({
      title: selectedDocument.title,
      description: selectedDocument.description || '',
      references: selectedDocument.references || '',
      projectId: selectedDocument.projectId || '',
      categoryId: selectedDocument.categoryId ? String(selectedDocument.categoryId) : '',
      tags: selectedDocument.tags.join(', '),
    })
    setEditOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="secondary" leftIcon={<RefreshCw size={16} />} onClick={() => void reloadAfterMutation(selectedDocumentId || undefined)}>
          Refresh
        </Button>
        {canManageTaxonomy ? (
          <>
            <Button variant="secondary" leftIcon={<FolderTree size={16} />} onClick={openCreateCategory}>
              Manage Categories
            </Button>
            <Button variant="secondary" leftIcon={<Tags size={16} />} onClick={() => setTagOpen(true)}>
              Tag
            </Button>
          </>
        ) : null}
        {canUpload ? (
          <Button leftIcon={<Upload size={16} />} onClick={() => setUploadOpen(true)}>
            Upload Document
          </Button>
        ) : null}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Indexed Documents" value={metrics.totalDocuments} helper="Files currently visible in your workspace library" icon={<Files size={18} />} tone="sky" />
        <AdminMetricCard label="Structured Categories" value={metrics.categories} helper="Reusable metadata groups for research content" icon={<FolderTree size={18} />} tone="emerald" />
        <AdminMetricCard label="Versioned Records" value={metrics.versionedDocuments} helper="Documents with more than one revision on file" icon={<History size={18} />} tone="amber" />
        <AdminMetricCard label="Archived Items" value={metrics.archivedDocuments} helper="Retained records still available for governed review" icon={<Archive size={18} />} tone="slate" />
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <Card
        title="Library Controls"
        subtitle="Filter the document index by keyword, project, category, tag, or archival status before drilling into version history and access events."
        actions={
          <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(190px,0.55fr)_minmax(190px,0.55fr)_minmax(190px,0.55fr)]">
            <SearchBar placeholder="Search titles, file names, descriptions, or references" onSearch={setSearch} debounceMs={300} />
            <Select
              options={[{ value: '', label: 'All Projects' }, ...projects.map((project) => ({ value: project.id, label: project.title }))]}
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
            />
            <Select
              options={[{ value: '', label: 'All Categories' }, ...categories.map((category) => ({ value: category.id, label: category.name }))]}
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            />
            <Select
              options={[
                { value: 'active', label: 'Active Only' },
                { value: 'all', label: 'Active + Archived' },
                { value: 'archived', label: 'Archived Only' },
              ]}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            />
          </div>
        }
      >
        {tags.length > 0 ? (
          <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-5">
            <button
              type="button"
              onClick={() => setActiveTagFilters([])}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${activeTagFilters.length === 0 ? 'bg-sky-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              All Tags
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTagFilter(tag.name)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${activeTagFilters.includes(tag.name) ? 'bg-sky-100 text-sky-800 ring-1 ring-sky-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                #{tag.name}
              </button>
            ))}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-[1.5rem] bg-slate-50 px-4 py-3 text-sm text-slate-500">
              <span>{visibleDocuments.length} document{visibleDocuments.length === 1 ? '' : 's'} in current view</span>
              <span>{tags.length} shared tag{tags.length === 1 ? '' : 's'}</span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-28 animate-pulse rounded-[1.5rem] bg-slate-100" />
                ))}
              </div>
            ) : visibleDocuments.length === 0 ? (
              <EmptyState
                icon={<SearchCode size={22} />}
                title="No documents found"
                message="Adjust your filters or upload a new research file to start building the shared document library."
                action={canUpload ? <Button leftIcon={<Plus size={16} />} onClick={() => setUploadOpen(true)}>Upload First Document</Button> : null}
              />
            ) : (
              <div className="space-y-3">
                {paginatedDocuments.map((entry) => {
                  const status = getStatusBadge(entry)
                  const selected = selectedDocumentId === entry.id

                  return (
                    <button
                      type="button"
                      id={`document-${entry.id}`}
                      key={entry.id}
                      onClick={() => setSelectedDocumentId(entry.id)}
                      className={`w-full rounded-[1.75rem] border px-5 py-4 text-left transition ${selected ? 'border-sky-300 bg-sky-50/70 shadow-[0_10px_24px_rgba(14,116,144,0.10)]' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-base font-semibold text-slate-900">{entry.title}</p>
                            <Badge variant={status.variant} text={status.text} />
                            <Badge variant="info" text={`v${entry.version}`} />
                          </div>
                          <p className="mt-1 truncate text-sm text-slate-500">{entry.originalFileName}</p>
                          <p className="mt-3 text-sm text-slate-600">{entry.description || 'No description provided.'}</p>
                        </div>
                        <div className="text-right text-xs text-slate-500">
                          <p>{formatBytes(entry.fileSize)}</p>
                          <p className="mt-1">Updated {relativeTime(entry.updatedAt)}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">{entry.categoryName || 'Uncategorized'}</span>
                        {entry.projectTitle ? <span className="rounded-full bg-slate-100 px-2.5 py-1">{entry.projectTitle}</span> : null}
                        {entry.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700">#{tag}</span>
                        ))}
                        {entry.tags.length > 3 ? <span className="rounded-full bg-slate-100 px-2.5 py-1">+{entry.tags.length - 3} more</span> : null}
                      </div>
                    </button>
                  )
                })}

                <Pagination
                  currentPage={documentPage}
                  totalPages={documentTotalPages}
                  totalItems={visibleDocuments.length}
                  pageSize={documentPageSize}
                  onPageChange={handleDocumentPageChange}
                />
              </div>
            )}
          </div>

          <div>
            {detailLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-32 animate-pulse rounded-[1.5rem] bg-slate-100" />
                ))}
              </div>
            ) : !selectedDocument ? (
              <EmptyState title="Select a document" message="Choose a document from the library to view metadata, version history, and file actions." />
            ) : (
              <div className="space-y-4">
                <Card
                  title={selectedDocument.title}
                  subtitle={`Uploaded by ${selectedDocument.uploadedByName} on ${formatDate(selectedDocument.createdAt)}`}
                  actions={
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="secondary" leftIcon={<Download size={16} />} onClick={() => void handleDownload(selectedDocument.id, selectedDocument.originalFileName)}>
                        Download
                      </Button>
                      {canVersionSelectedDocument ? (
                        <Button variant="secondary" leftIcon={<History size={16} />} onClick={() => setVersionOpen(true)}>
                          Add Version
                        </Button>
                      ) : null}
                      {canEditSelectedDocument ? (
                        <Button leftIcon={<ShieldCheck size={16} />} onClick={openEditDialog}>
                          Edit Metadata
                        </Button>
                      ) : null}
                      {canArchiveSelectedDocument && !selectedDocument.isArchived ? (
                        <Button variant="secondary" leftIcon={<Archive size={16} />} onClick={() => void handleArchiveDocument()} loading={saving}>
                          Archive
                        </Button>
                      ) : null}
                      {canDeleteSelectedDocument ? (
                        <Button variant="danger" leftIcon={<Trash2 size={16} />} onClick={() => void handleDeleteDocument()} loading={saving}>
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  }
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Current File</p>
                      <p className="mt-3 text-sm font-semibold text-slate-900">{selectedDocument.originalFileName}</p>
                      <p className="mt-1 text-sm text-slate-500">{formatBytes(selectedDocument.fileSize)} • {selectedDocument.fileType}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Governance</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge variant={getStatusBadge(selectedDocument).variant} text={getStatusBadge(selectedDocument).text} />
                        <Badge variant="info" text={`Version ${selectedDocument.version}`} />
                        <span className="text-sm text-slate-500">Updated {relativeTime(selectedDocument.updatedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 text-sm text-slate-600">
                      <p><span className="font-semibold text-slate-900">Category:</span> {selectedDocument.categoryName || 'Uncategorized'}</p>
                      <p><span className="font-semibold text-slate-900">Project:</span> {selectedDocument.projectTitle || 'Not linked to a project'}</p>
                      <p><span className="font-semibold text-slate-900">Last Updated:</span> {formatDate(selectedDocument.updatedAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Description</p>
                      <p className="mt-2 text-sm text-slate-600">{selectedDocument.description || 'No description provided for this document.'}</p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">References</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{selectedDocument.references || 'No references recorded for this research document.'}</p>
                  </div>

                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Tags</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedDocument.tags.length === 0 ? <span className="text-sm text-slate-500">No tags assigned.</span> : null}
                      {selectedDocument.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">#{tag}</span>
                      ))}
                    </div>
                  </div>
                </Card>

                <Card title="Version History" subtitle="Track revision uploads and restore the right reference file for handoffs and reviews.">
                  {selectedDocument.versions.length === 0 ? (
                    <EmptyState title="No versions tracked" message="Version uploads will appear here after the initial file is created." />
                  ) : (
                    <div className="space-y-3">
                      {selectedDocument.versions.map((version) => (
                        <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-slate-200 px-4 py-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900">Version {version.versionNumber}</p>
                              {version.versionNumber === selectedDocument.version ? <Badge variant="success" text="Current" /> : null}
                            </div>
                            <p className="mt-1 text-sm text-slate-500">{version.fileName} • {formatBytes(version.fileSize)}</p>
                            <p className="mt-2 text-sm text-slate-600">{version.changeNotes || 'No release notes added for this revision.'}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2 text-right">
                            <p className="text-xs text-slate-500">{formatDate(version.createdAt)}</p>
                            <Button variant="secondary" size="sm" leftIcon={<Download size={14} />} onClick={() => void handleVersionDownload(version.versionNumber, version.fileName)}>
                              Download Version
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card title="Access Activity" subtitle="Recent document access events recorded for governance and review." padding="sm">
                  {selectedDocument.accessLogs.length === 0 ? (
                    <EmptyState title="No access activity yet" message={canViewAccessLogs ? 'Document views and downloads will appear here as they happen.' : 'Access activity is visible to document managers.'} />
                  ) : (
                    <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200 bg-white">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">User</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Action</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">When</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">IP Address</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedDocument.accessLogs.slice(0, 8).map((log) => (
                            <tr key={log.id}>
                              <td className="px-4 py-3 text-sm text-slate-700">{log.userName}</td>
                              <td className="px-4 py-3 text-sm text-slate-700">{log.action}</td>
                              <td className="px-4 py-3 text-sm text-slate-500">{formatDate(log.accessedAt)}</td>
                              <td className="px-4 py-3 text-sm text-slate-500">{log.ipAddress || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Modal isOpen={uploadOpen} onClose={() => {
        setUploadOpen(false)
      }} title="Upload Research Document" size="lg">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Document Title" value={uploadForm.title} onChange={(event) => setUploadForm((current) => ({ ...current, title: event.target.value }))} requiredField />
            <Select
              label="Category"
              options={[{ value: '', label: 'Select category' }, ...categories.map((category) => ({ value: category.id, label: category.name }))]}
              value={uploadForm.categoryId}
              onChange={(event) => setUploadForm((current) => ({ ...current, categoryId: event.target.value }))}
              hint={canManageTaxonomy ? 'Manage categories from the Manage Categories button above.' : undefined}
            />
          </div>

          <Select
            label="Project Link"
            options={[{ value: '', label: role === 'TeamMember' ? 'Project selection required' : 'No linked project' }, ...projects.map((project) => ({ value: project.id, label: project.title }))]}
            value={uploadForm.projectId}
            onChange={(event) => setUploadForm((current) => ({ ...current, projectId: event.target.value }))}
          />

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Description</span>
            <textarea className={textareaClassName} value={uploadForm.description} onChange={(event) => setUploadForm((current) => ({ ...current, description: event.target.value }))} />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">References</span>
            <textarea className={textareaClassName} value={uploadForm.references} onChange={(event) => setUploadForm((current) => ({ ...current, references: event.target.value }))} placeholder="List citations, sources, DOI links, journals, books, or web references used in this research." />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Upload File *</span>
            <input
              type="file"
              className="block w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-sky-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
              onChange={(event) => setUploadForm((current) => ({ ...current, file: event.target.files?.[0] || null }))}
            />
            <p className="text-xs text-slate-400">Supported files: PDF, DOCX, XLSX, PPTX, TXT, CSV, PNG, JPG, ZIP, RAR up to 50MB.</p>
          </label>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => {
              setUploadOpen(false)
            }}>Cancel</Button>
            <Button onClick={() => void submitUpload()} loading={saving} disabled={!uploadForm.title.trim() || !uploadForm.file || (role === 'TeamMember' && !uploadForm.projectId)}>
              Upload
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={editOpen && !!editForm} onClose={() => {
        setEditOpen(false)
        closeEditInlineManagers()
      }} title="Edit Document Metadata" size="lg">
        {editForm ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Document Title" value={editForm.title} onChange={(event) => setEditForm((current) => current ? { ...current, title: event.target.value } : current)} requiredField />
              <Select
                label="Category"
                options={[{ value: '', label: 'Select category' }, ...categories.map((category) => ({ value: category.id, label: category.name }))]}
                value={editForm.categoryId}
                onChange={(event) => setEditForm((current) => current ? { ...current, categoryId: event.target.value } : current)}
                hint={canManageTaxonomy ? 'Manage categories from the Manage Categories button above.' : undefined}
              />
            </div>

            <Select
              label="Project Link"
              options={[{ value: '', label: 'No linked project' }, ...projects.map((project) => ({ value: project.id, label: project.title }))]}
              value={editForm.projectId}
              onChange={(event) => setEditForm((current) => current ? { ...current, projectId: event.target.value } : current)}
            />

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Tags</span>
                {canManageTaxonomy ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={openEditTagManager}>
                      New Tag
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      leftIcon={<Tags size={14} />}
                      onClick={() => setEditTagManagerOpen((current) => !current)}
                    >
                      {editTagManagerOpen ? 'Hide Tags' : 'Manage Tags'}
                    </Button>
                  </div>
                ) : null}
              </div>

              <Input value={editForm.tags} onChange={(event) => setEditForm((current) => current ? { ...current, tags: event.target.value } : current)} hint="Separate tags with commas" />
            </div>

            {canManageTaxonomy && editTagManagerOpen ? (
              <div className="space-y-4 rounded-[1.75rem] border border-emerald-100 bg-emerald-50/65 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Tag Actions</h3>
                    <p className="mt-1 text-sm text-slate-500">Create, apply, and prune tags without leaving this metadata editor.</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={closeEditTagManager}>
                    Close
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                  <Input label="Tag Name" value={tagForm.name} onChange={(event) => setTagForm({ name: event.target.value })} requiredField />
                  <Button type="button" onClick={() => void submitTag()} loading={saving} disabled={!tagForm.name.trim()}>
                    Create Tag
                  </Button>
                </div>

                <div className="space-y-3 border-t border-emerald-100 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-900">Existing Tags</h4>
                    <span className="text-xs text-slate-500">{tags.length} total</span>
                  </div>

                  {tags.length === 0 ? (
                    <EmptyState title="No tags yet" message="Create a tag here and apply it to the document immediately." />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => {
                        const isApplied = hasTagValue(editForm.tags, tag.name)

                        return (
                          <div key={tag.id} className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${isApplied ? 'border-emerald-200 bg-white shadow-[0_10px_20px_rgba(16,185,129,0.10)]' : 'border-slate-200 bg-white/90 text-slate-700'}`}>
                            <button type="button" className={`font-medium ${isApplied ? 'text-emerald-700' : 'text-slate-700'}`} onClick={() => toggleEditTag(tag.name)}>
                              #{tag.name}
                            </button>
                            {isApplied ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Applied</span> : null}
                            {canDeleteTaxonomy ? (
                              <button type="button" className="text-slate-400 transition hover:text-rose-600" onClick={() => void handleDeleteTag(tag)} aria-label={`Delete ${tag.name}`}>
                                <Trash2 size={14} />
                              </button>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Description</span>
              <textarea className={textareaClassName} value={editForm.description} onChange={(event) => setEditForm((current) => current ? { ...current, description: event.target.value } : current)} />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">References</span>
              <textarea className={textareaClassName} value={editForm.references} onChange={(event) => setEditForm((current) => current ? { ...current, references: event.target.value } : current)} placeholder="List citations, sources, DOI links, journals, books, or web references used in this research." />
            </label>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => {
                setEditOpen(false)
                closeEditInlineManagers()
              }}>Cancel</Button>
              <Button onClick={() => void submitEdit()} loading={saving} disabled={!editForm.title.trim()}>Save Changes</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal isOpen={versionOpen} onClose={() => setVersionOpen(false)} title="Upload New Version" size="md">
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Revision Notes</span>
            <textarea className={textareaClassName} value={versionForm.changeNotes} onChange={(event) => setVersionForm((current) => ({ ...current, changeNotes: event.target.value }))} />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Version File *</span>
            <input
              type="file"
              className="block w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-sky-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
              onChange={(event) => setVersionForm((current) => ({ ...current, file: event.target.files?.[0] || null }))}
            />
          </label>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setVersionOpen(false)}>Cancel</Button>
            <Button onClick={() => void submitVersion()} loading={saving} disabled={!versionForm.file}>Upload Version</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={categoryOpen} onClose={() => { setCategoryOpen(false); setCategoryForm(emptyCategoryForm) }} title={categoryForm.id ? 'Update Document Category' : 'Create Document Category'} size="lg">
        <div className="space-y-6">
          <div className="space-y-4">
            <Input label="Category Name" value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} requiredField />
            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Description</span>
              <textarea className={textareaClassName} value={categoryForm.description} onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <div className="flex justify-end gap-2">
              {categoryForm.id ? <Button variant="ghost" onClick={() => setCategoryForm(emptyCategoryForm)}>Clear Edit</Button> : null}
              <Button variant="secondary" onClick={() => { setCategoryOpen(false); setCategoryForm(emptyCategoryForm) }}>Close</Button>
              <Button onClick={() => void submitCategory()} loading={saving} disabled={!categoryForm.name.trim()}>{categoryForm.id ? 'Save Category' : 'Create Category'}</Button>
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-200 pt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Existing Categories</h3>
              <span className="text-xs text-slate-500">{categories.length} total</span>
            </div>
            {categories.length === 0 ? (
              <EmptyState title="No categories yet" message="Create a category to organize document metadata across the workspace." />
            ) : (
              <div className="space-y-3">
                {categories.map((category) => (
                  <div key={category.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-slate-200 px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{category.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{category.description || 'No description provided.'}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEditCategory(category)}>Edit</Button>
                      {canDeleteTaxonomy ? <Button variant="danger" size="sm" onClick={() => void handleDeleteCategory(category)}>Delete</Button> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal isOpen={tagOpen} onClose={() => { setTagOpen(false); setTagForm({ name: '' }) }} title="Manage Document Tags" size="lg">
        <div className="space-y-6">
          <div className="space-y-4">
            <Input label="Tag Name" value={tagForm.name} onChange={(event) => setTagForm({ name: event.target.value })} requiredField />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setTagOpen(false); setTagForm({ name: '' }) }}>Close</Button>
              <Button onClick={() => void submitTag()} loading={saving} disabled={!tagForm.name.trim()}>Create Tag</Button>
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-200 pt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Existing Tags</h3>
              <span className="text-xs text-slate-500">{tags.length} total</span>
            </div>
            {tags.length === 0 ? (
              <EmptyState title="No tags yet" message="Create tags to support faster document search and filtering." />
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <div key={tag.id} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                    <span>#{tag.name}</span>
                    {canDeleteTaxonomy ? (
                      <button type="button" className="text-slate-400 transition hover:text-rose-600" onClick={() => void handleDeleteTag(tag)} aria-label={`Delete ${tag.name}`}>
                        <Trash2 size={14} />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}