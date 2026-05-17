import { CheckCircle2, HelpCircle, LockKeyhole, Shield, SlidersHorizontal, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import * as authApi from '../../api/authApi'
import { securityQuestions } from '../../constants/securityQuestions'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { ToggleSwitch } from '../../components/ui/ToggleSwitch'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import { classNames } from '../../utils/classNames'
import { normalizeDigitOnlyValue } from '../../utils/numericInput'
import { roleLabel } from '../../utils/roleHelpers'

type SettingsTab = 'profile' | 'security' | 'account' | 'customization'

type SettingsState = {
  profile: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  security: {
    twoFactor: boolean
    deviceApproval: boolean
    sessionTimeout: string
  }
  account: {
    auditAlerts: boolean
    weeklyDigest: boolean
    milestoneSummaries: boolean
  }
  customization: {
    defaultLanding: string
    dateFormat: string
    compactMode: boolean
  }
}

type SecurityQuestionFormState = {
  question: string
  answer: string
  confirmAnswer: string
}

const storageKey = 'innotrack-admin-settings'

function buildDefaultSettings(user?: { firstName?: string; lastName?: string; email?: string } | null): SettingsState {
  return {
    profile: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: '',
    },
    security: {
      twoFactor: true,
      deviceApproval: false,
      sessionTimeout: '30',
    },
    account: {
      auditAlerts: true,
      weeklyDigest: true,
      milestoneSummaries: true,
    },
    customization: {
      defaultLanding: 'dashboard',
      dateFormat: 'MMMM d, yyyy',
      compactMode: false,
    },
  }
}

function mergeStoredSettings(base: SettingsState) {
  try {
    const stored = localStorage.getItem(storageKey)
    if (!stored) {
      return base
    }

    const parsed = JSON.parse(stored) as Partial<SettingsState>
    const mergedProfile = { ...base.profile, ...parsed.profile }
    return {
      profile: { ...mergedProfile, phone: normalizeDigitOnlyValue(base.profile.phone) },
      security: { ...base.security, ...parsed.security },
      account: { ...base.account, ...parsed.account },
      customization: { ...base.customization, ...parsed.customization },
    }
  } catch {
    return base
  }
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-slate-200 px-4 py-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} ariaLabel={label} />
    </div>
  )
}

export function SettingsPage() {
  const toast = useToast()
  const { user, refreshUser } = useAuth()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [settingsState, setSettingsState] = useState<SettingsState>(() => mergeStoredSettings(buildDefaultSettings(user)))
  const [isSaving, setIsSaving] = useState(false)
  const [isProfileSyncing, setIsProfileSyncing] = useState(true)
  const [questionState, setQuestionState] = useState<authApi.SecurityQuestionState>({ hasSecurityQuestion: false, question: '' })
  const [questionModalOpen, setQuestionModalOpen] = useState(false)
  const [questionSaving, setQuestionSaving] = useState(false)
  const [questionError, setQuestionError] = useState<string | null>(null)
  const [questionForm, setQuestionForm] = useState<SecurityQuestionFormState>({
    question: securityQuestions[0],
    answer: '',
    confirmAnswer: '',
  })

  useEffect(() => {
    setSettingsState(mergeStoredSettings(buildDefaultSettings(user)))
  }, [user])

  useEffect(() => {
    let active = true

    async function hydrateProfile() {
      setIsProfileSyncing(true)
      try {
        const [profile, securityQuestion] = await Promise.all([
          authApi.getCurrentUser().catch(() => null),
          authApi.getSecurityQuestionState().catch(() => null),
        ])

        if (!active) {
          return
        }

        if (profile) {
          setSettingsState((current) => ({
            ...current,
            profile: {
              ...current.profile,
              firstName: profile.firstName || current.profile.firstName,
              lastName: profile.lastName || current.profile.lastName,
              email: profile.email,
              phone: normalizeDigitOnlyValue(profile.phone ?? ''),
            },
          }))
        }

        if (securityQuestion) {
          setQuestionState(securityQuestion)
          setQuestionForm((current) => ({
            ...current,
            question: securityQuestion.question || current.question,
          }))
        }
      } finally {
        if (active) {
          setIsProfileSyncing(false)
        }
      }
    }

    void hydrateProfile()

    return () => {
      active = false
    }
  }, [user?.id])

  const tabs = useMemo(
    () => [
      { key: 'profile' as const, label: 'Profile', icon: <UserRound size={18} /> },
      { key: 'security' as const, label: 'Security', icon: <LockKeyhole size={18} /> },
      { key: 'account' as const, label: 'Account', icon: <Shield size={18} /> },
      { key: 'customization' as const, label: 'Customization', icon: <SlidersHorizontal size={18} /> },
    ],
    [],
  )

  const sectionSubtitle = activeTab === 'profile'
    ? 'Manage your personal information.'
    : activeTab === 'security'
      ? 'Control sign-in protection, recovery, and session behavior.'
      : activeTab === 'account'
        ? 'Adjust how the account receives updates and alerts.'
        : 'Set workspace defaults and display preferences.'

  const fullName = `${settingsState.profile.firstName} ${settingsState.profile.lastName}`.trim() || user?.email || 'Workspace User'

  async function saveSettings() {
    const firstName = settingsState.profile.firstName.trim()
    const lastName = settingsState.profile.lastName.trim()
    const phone = normalizeDigitOnlyValue(settingsState.profile.phone)

    if (firstName.length < 2 || lastName.length < 2) {
      toast.error('First name and last name must each be at least 2 characters.')
      return
    }

    if (phone && (phone.length < 7 || phone.length > 20)) {
      toast.error('Phone number must be between 7 and 20 digits.')
      return
    }

    const toastId = toast.loading('Saving settings...')
    setIsSaving(true)
    try {
      const profile = await authApi.updateProfile({ firstName, lastName, phone: phone || undefined })
      const nextState = {
        ...settingsState,
        profile: {
          ...settingsState.profile,
          firstName: profile.firstName || firstName,
          lastName: profile.lastName || lastName,
          email: profile.email,
          phone: normalizeDigitOnlyValue(profile.phone ?? phone),
        },
      }

      setSettingsState(nextState)
      await refreshUser()
      localStorage.setItem(storageKey, JSON.stringify(nextState))
      toast.dismiss(toastId)
      toast.success('Settings saved successfully')
    } catch (error) {
      toast.dismiss(toastId)
      toast.error(error instanceof Error ? error.message : 'Could not save settings')
    } finally {
      setIsSaving(false)
    }
  }

  function resetSettings() {
    setSettingsState(mergeStoredSettings(buildDefaultSettings(user)))
    toast.success('Unsaved changes cleared')
  }

  async function saveSecurityQuestion() {
    setQuestionError(null)

    if (!questionForm.answer.trim() || !questionForm.confirmAnswer.trim()) {
      setQuestionError('Both answer fields are required.')
      return
    }

    if (questionForm.answer.trim() !== questionForm.confirmAnswer.trim()) {
      setQuestionError('Answers do not match.')
      return
    }

    const toastId = toast.loading('Saving security question...')
    setQuestionSaving(true)
    try {
      const response = await authApi.updateSecurityQuestion(questionForm)
      setQuestionState(response)
      setQuestionModalOpen(false)
      setQuestionForm({
        question: response.question || questionForm.question,
        answer: '',
        confirmAnswer: '',
      })
      toast.dismiss(toastId)
      toast.success('Security question saved')
    } catch (error) {
      toast.dismiss(toastId)
      setQuestionError(error instanceof Error ? error.message : 'Could not save security question')
    } finally {
      setQuestionSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-slate-900">{tabs.find((tab) => tab.key === activeTab)?.label || 'Settings'} Settings</h2>
        <p className="text-sm text-slate-500">{sectionSubtitle}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[220px_1fr]">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.04)]">
          <div className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={classNames(
                  'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition',
                  activeTab === tab.key ? 'bg-sky-50 text-sky-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_14px_32px_rgba(15,23,42,0.04)]">
          {activeTab === 'profile' ? (
            <>
              <div className="flex flex-wrap items-center gap-5 rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sky-900 text-3xl font-semibold text-white">
                  {fullName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900">{fullName}</p>
                  <p className="mt-1 text-sm text-slate-400">{roleLabel(user?.role)}</p>
                  {isProfileSyncing ? <p className="mt-2 text-xs text-sky-700">Syncing profile details from your account...</p> : null}
                </div>
              </div>

              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <Input label="First Name" value={settingsState.profile.firstName} onChange={(event) => setSettingsState((current) => ({ ...current, profile: { ...current.profile, firstName: event.target.value } }))} />
                <Input label="Last Name" value={settingsState.profile.lastName} onChange={(event) => setSettingsState((current) => ({ ...current, profile: { ...current.profile, lastName: event.target.value } }))} />
                <div className="md:col-span-2">
                  <Input label="Email Address" value={settingsState.profile.email} disabled hint="Email cannot be changed. Contact your administrator." />
                </div>
                <div className="md:col-span-2">
                  <Input label="Phone Number" value={settingsState.profile.phone} numericMode="integer" onChange={(event) => setSettingsState((current) => ({ ...current, profile: { ...current.profile, phone: event.target.value } }))} hint="Stored on your account for profile access." />
                </div>
              </div>
            </>
          ) : null}

          {activeTab === 'security' ? (
            <div className="space-y-4">
              <ToggleRow label="Two-factor authentication" description="Require a second step when signing into the workspace." checked={settingsState.security.twoFactor} onChange={(next) => setSettingsState((current) => ({ ...current, security: { ...current.security, twoFactor: next } }))} />
              <ToggleRow label="New device approval" description="Prompt for confirmation when the account is accessed from a new device." checked={settingsState.security.deviceApproval} onChange={(next) => setSettingsState((current) => ({ ...current, security: { ...current.security, deviceApproval: next } }))} />
              <Select
                label="Session Timeout"
                options={[
                  { value: '15', label: '15 minutes' },
                  { value: '30', label: '30 minutes' },
                  { value: '60', label: '60 minutes' },
                ]}
                value={settingsState.security.sessionTimeout}
                onChange={(event) => setSettingsState((current) => ({ ...current, security: { ...current.security, sessionTimeout: event.target.value } }))}
              />

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <HelpCircle className="h-4 w-4 text-amber-600" />
                      Security question recovery
                    </div>
                    <p className="text-sm text-slate-500">
                      Save one recovery question so you can reset your password from the login screen if you forget it.
                    </p>
                    {questionState.hasSecurityQuestion ? (
                      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Question configured
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        <HelpCircle className="h-3.5 w-3.5" />
                        No recovery question configured yet
                      </div>
                    )}
                  </div>

                  <Button variant="secondary" onClick={() => setQuestionModalOpen(true)}>
                    {questionState.hasSecurityQuestion ? 'Update Question' : 'Set Up Question'}
                  </Button>
                </div>

                {questionState.question ? (
                  <div className="mt-4 rounded-2xl border border-sky-100 bg-white px-4 py-4 text-sm text-slate-600">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Current prompt</p>
                    <p className="mt-2 text-base font-semibold text-slate-900">{questionState.question}</p>
                    <p className="mt-2 text-sm text-slate-500">The answer is stored securely and checked case-insensitively during password recovery.</p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {activeTab === 'account' ? (
            <div className="space-y-4">
              <ToggleRow label="Audit activity alerts" description="Receive updates for sensitive admin activity and access changes." checked={settingsState.account.auditAlerts} onChange={(next) => setSettingsState((current) => ({ ...current, account: { ...current.account, auditAlerts: next } }))} />
              <ToggleRow label="Weekly digest" description="Get a recap of project progress, risk areas, and workspace usage every week." checked={settingsState.account.weeklyDigest} onChange={(next) => setSettingsState((current) => ({ ...current, account: { ...current.account, weeklyDigest: next } }))} />
              <ToggleRow label="Milestone summaries" description="Notify stakeholders when projects reach scheduled review dates." checked={settingsState.account.milestoneSummaries} onChange={(next) => setSettingsState((current) => ({ ...current, account: { ...current.account, milestoneSummaries: next } }))} />
            </div>
          ) : null}

          {activeTab === 'customization' ? (
            <div className="space-y-4">
              <Select
                label="Default Landing Page"
                options={[
                  { value: 'dashboard', label: 'Dashboard' },
                  { value: 'projects', label: 'Projects' },
                  { value: 'reports', label: 'Reports' },
                ]}
                value={settingsState.customization.defaultLanding}
                onChange={(event) => setSettingsState((current) => ({ ...current, customization: { ...current.customization, defaultLanding: event.target.value } }))}
              />
              <Select
                label="Date Format"
                options={[
                  { value: 'MMMM d, yyyy', label: 'MMMM d, yyyy' },
                  { value: 'MM/dd/yyyy', label: 'MM/dd/yyyy' },
                  { value: 'dd MMM yyyy', label: 'dd MMM yyyy' },
                ]}
                value={settingsState.customization.dateFormat}
                onChange={(event) => setSettingsState((current) => ({ ...current, customization: { ...current.customization, dateFormat: event.target.value } }))}
              />
              <ToggleRow label="Compact interface density" description="Reduce spacing and increase information density in admin views." checked={settingsState.customization.compactMode} onChange={(next) => setSettingsState((current) => ({ ...current, customization: { ...current.customization, compactMode: next } }))} />
            </div>
          ) : null}

          <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 pt-6">
            <Button variant="secondary" onClick={resetSettings}>Cancel</Button>
            <Button onClick={() => void saveSettings()} loading={isSaving}>Save Changes</Button>
          </div>
        </section>
      </div>

      <Modal
        isOpen={questionModalOpen}
        onClose={() => {
          setQuestionModalOpen(false)
          setQuestionError(null)
        }}
        title="Security Question Setup"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setQuestionModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveSecurityQuestion()} loading={questionSaving}>
              Save Security Question
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="rounded-2xl bg-slate-100 px-4 py-4 text-center text-sm text-slate-600">
            Set up a security question to help recover your account if you forget your password.
          </div>

          {questionState.hasSecurityQuestion ? (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-center text-sm text-sky-700">
              You already have a security question set up. Updating it will replace the existing one.
            </div>
          ) : null}

          <Select
            label="Select Security Question"
            options={securityQuestions.map((question) => ({ value: question, label: question }))}
            value={questionForm.question}
            onChange={(event) => setQuestionForm((current) => ({ ...current, question: event.target.value }))}
          />

          <Input
            label="Your Answer"
            placeholder="Enter your answer (case-insensitive)"
            value={questionForm.answer}
            onChange={(event) => setQuestionForm((current) => ({ ...current, answer: event.target.value }))}
            hint="Remember this answer. You will need it to reset your password."
          />

          <Input
            label="Confirm Answer"
            placeholder="Confirm your answer"
            value={questionForm.confirmAnswer}
            onChange={(event) => setQuestionForm((current) => ({ ...current, confirmAnswer: event.target.value }))}
          />

          {questionError ? <p className="text-sm text-rose-600">{questionError}</p> : null}
        </div>
      </Modal>
    </div>
  )
}