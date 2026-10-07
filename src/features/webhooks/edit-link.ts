export const EDIT_LINK_STATE = { fromList: true } as const

export function isOpenedFromList(state: unknown): boolean {
  return typeof state === 'object' && state !== null && 'fromList' in state && state.fromList === true
}
