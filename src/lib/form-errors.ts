import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { getErrorMessage, isValidationError } from '@/api'

export const SERVER_ERROR = 'server'

export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  fields: readonly Path<T>[],
  setError: UseFormSetError<T>,
): void {
  if (!isValidationError(error)) {
    setError(`root.${SERVER_ERROR}`, { message: getErrorMessage(error) })
    return
  }

  const unmatched: string[] = []
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    const formField = fields.find((name) => name === field)
    if (formField) setError(formField, { type: 'server', message: messages.join(' ') }, { shouldFocus: true })
    else unmatched.push(...messages)
  }

  if (unmatched.length > 0 || Object.keys(error.fieldErrors).length === 0) {
    setError(`root.${SERVER_ERROR}`, { message: unmatched.join(' ') || error.message })
  }
}
