import { axiosInstance } from './axiosInstance'
import type { SignupPlanId } from '../utils/signupFlow'
import { getErrorMessage } from '../utils/apiError'

export type AuthUserProfile = {
  id: string
  firstName?: string
  lastName?: string
  fullName?: string
  name?: string
  email: string
  phone?: string | null
  role?: string
  roles?: string[]
  organizationId?: string | null
  mustChangePassword?: boolean
}

export type LoginResponse = {
  token?: string
  accessToken?: string
  user?: AuthUserProfile
}

export type LoginCaptchaChallenge = {
  challengeId: string
  imageDataUrl: string
  expiresAtUtc: string
  answerLength: number
}

export type SecurityQuestionState = {
  hasSecurityQuestion: boolean
  question?: string | null
}

export type UpdateSecurityQuestionPayload = {
  question: string
  answer: string
  confirmAnswer: string
}

export type ForgotPasswordQuestionResponse = {
  email: string
  recoveryMethod: 'SecurityQuestion' | 'EmailOtp'
  question?: string | null
  otpSent: boolean
  deliveryHint?: string | null
  otpExpiresAtUtc?: string | null
}

export async function getLoginCaptchaChallenge() {
  try {
    const { data } = await axiosInstance.get<LoginCaptchaChallenge>('/auth/login-captcha', {
      headers: { 'Cache-Control': 'no-cache' },
    })
    return data
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Captcha could not be loaded'))
  }
}

export async function precheckLogin(email: string, password: string, captchaToken: string) {
  try {
    await axiosInstance.post('/auth/login/precheck', { email, password, captchaToken })
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Could not verify your credentials'))
  }
}

export async function login(email: string, password: string, captchaToken: string, captchaChallengeId?: string) {
  try {
    const { data } = await axiosInstance.post<LoginResponse>('/auth/login', { email, password, captchaToken, captchaChallengeId })
    return data
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Login failed'))
  }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  await axiosInstance.post('/auth/change-password', { currentPassword, newPassword })
}

export async function getCurrentUser() {
  const { data } = await axiosInstance.get<AuthUserProfile>('/auth/me')
  return data
}

export async function updateProfile(payload: { firstName: string; lastName: string; phone?: string }) {
  const { data } = await axiosInstance.put<AuthUserProfile>('/auth/profile', payload)
  return data
}

export async function getSecurityQuestionState() {
  const { data } = await axiosInstance.get<SecurityQuestionState>('/auth/security-question')
  return data
}

export async function updateSecurityQuestion(payload: UpdateSecurityQuestionPayload) {
  const { data } = await axiosInstance.put<SecurityQuestionState>('/auth/security-question', payload)
  return data
}

export async function getForgotPasswordQuestion(email: string) {
  const { data } = await axiosInstance.post<ForgotPasswordQuestionResponse>('/auth/forgot-password/question', { email })
  return data
}

export async function resetPasswordWithSecurityQuestion(payload: {
  email: string
  answer?: string
  otpCode?: string
  newPassword: string
  confirmNewPassword: string
}) {
  await axiosInstance.post('/auth/forgot-password/reset', payload)
}

export async function logout() {
  await axiosInstance.post('/auth/logout')
}

export type PublicOnboardingRequest = {
  companyName: string
  industry: string
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string
  password: string
  planId: SignupPlanId
  paymentMethod: 'card' | 'gcash' | 'grabpay' | 'maya' | 'paymongo'
  captchaToken: string
  captchaChallengeId?: string
}

export type PublicOnboardingResponse = {
  organizationId: string
  adminUserId: string
  companyName: string
  adminEmail: string
  plan: string
  paymentReference: string
  approvalStatus: 'Pending' | 'Approved'
}

export type PublicOnboardingCheckoutSession = {
  pendingOnboardingId: string
  checkoutSessionId: string
  checkoutUrl: string
}

export async function createPublicOnboardingCheckout(payload: PublicOnboardingRequest) {
  const { data } = await axiosInstance.post<PublicOnboardingCheckoutSession>('/public/onboarding/checkout', payload)
  return data
}

export async function retryPublicOnboardingCheckout(pendingOnboardingId: string, payload: { paymentMethod: 'card' | 'gcash' | 'grabpay' | 'maya' | 'paymongo'; captchaToken: string; captchaChallengeId?: string }) {
  const { data } = await axiosInstance.post<PublicOnboardingCheckoutSession>(`/public/onboarding/checkout/${pendingOnboardingId}/retry`, payload)
  return data
}

export async function completeOnboardingCheckout(pendingOnboardingId: string) {
  const { data } = await axiosInstance.post<PublicOnboardingResponse>('/public/onboarding/complete', { pendingOnboardingId })
  return data
}
