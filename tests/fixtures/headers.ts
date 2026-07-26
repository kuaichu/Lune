let sessionToken: string | undefined

export function setSessionToken(token: string | undefined) {
  sessionToken = token
}

export async function cookies() {
  return {
    get(name: string) {
      return sessionToken ? { name, value: sessionToken } : undefined
    },
  }
}
