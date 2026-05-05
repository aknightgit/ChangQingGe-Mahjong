import { joinURL } from 'ufo'

export default defineNuxtPlugin(() => {
  const runtimeConfig = useRuntimeConfig()
  const appBaseURL = runtimeConfig.app.baseURL || '/'
  const originalFetch = globalThis.$fetch

  const normalizeRequest = (request: Parameters<typeof originalFetch>[0]) => {
    if (typeof request === 'string' && request.startsWith('/api/')) {
      return joinURL(appBaseURL, request.slice(1))
    }

    return request
  }

  const wrappedFetch = ((request, options) => {
    return originalFetch(normalizeRequest(request), options)
  }) as typeof originalFetch

  wrappedFetch.raw = ((request, options) => {
    return originalFetch.raw(normalizeRequest(request), options)
  }) as typeof originalFetch.raw
  wrappedFetch.native = originalFetch.native.bind(originalFetch)
  wrappedFetch.create = originalFetch.create.bind(originalFetch)

  globalThis.$fetch = wrappedFetch
})
