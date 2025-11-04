---
title: "Skeletons in My Codebase: Tanstack in Production"
summary: "Clearing out the skeletons in auth flows and loading patterns to create clean front-end user experiences."
date: 2025-10-31
author: Oscar Gabriel
headerImage: "/images/skeleton-dance.jpg"
headerImageCaption: "The Skeleton Dance (1929)"
---

## Introduction

If you've spent any time with [TanStack Router](https://tanstack.com/router), you know it's incredibly powerful. It provides both file-based and code-based routing, type-safe parameters, data loading, authentication guards, error boundaries. It's a solid foundation on which to build any kind of modern React app. The docs are excellent at explaining features: what `beforeLoad` does, what the file naming conventions are, when `pendingComponent` renders. But they don't prescribe how to combine these features into a cohesive, performant front-end architecture for *your* app. Obviously, that's up to you to figure out!

There are multiple ways to handle authentication. Multiple approaches to data loading. Different patterns for redirects. Even within file-based routing, you can choose between flat, directory-based, or mixed route organization. The docs give you primitives and trust you to use them correctly. This leaves you with unanswered questions: Where should auth checks happen? How do you prevent race conditions? When should you prefetch? Which parent route pattern should I use for layouts? For experienced developers who've solved these problems before, the flexibility is welcome. For anyone still trying to learn the *right* patterns for *different* use cases, it's a gap.

Then, when you combine TanStack Router with [Better Auth](https://better-auth.com) (another powerful, flexible library), you're faced with even more decisions. Where should auth state live? When should guards execute? How do you prevent that annoying page flash where you briefly see protected content before being redirected? How do you make loading states smooth? Should redirects happen in `beforeLoad`, `useEffect`, or somewhere else?

I'm writing this because I had to figure all of this out myself while building [Better Chat](https://chat.oscargabriel.dev). I spent several days combing through docs, piecing together patterns through trial and error until I arrived at something that looked and behaved exactly like I was envisioning.

Along the way, I kept running into the same kinds of problems: hidden gotchas that would haunt my app until I addressed them properly. Route conflicts that only surfaced well after scaffolding. Authentication race conditions that caused jarring page flashes. Loading states that felt broken. These are our "skeletons", the skulkers rattling around causing small but critical issues in production. This blog post is about identifying those skeletons and clearing them out of your ~~closet~~ codebase.

---
## Skeleton #1: Router Layouts

When building a real application with TanStack Router, you quickly run into organizational questions: Where do files go? How do you share layouts between routes? How do auth guards apply to child routes? When do you use pathless layouts vs grouped routes?

The docs show you *how* parent routes work for sharing UI and logic, but don't prescribe when to use which pattern or how to structure features around them.

### File-Based Routing: Quick Reference

| Pattern | Example | URL | Purpose |
|---------|---------|-----|---------|
| `index.tsx` | `routes/index.tsx` | `/` | Exact path match |
| `$param` | `routes/users/$userId.tsx` | `/users/123` | Dynamic segments |
| `route.tsx` | `routes/chat/route.tsx` | `/chat` | Layout (wraps children) |
| `_pathless/` | `routes/_auth/route.tsx` | No URL change | Shared guards without URL nesting |
| `-folder/` | `routes/chat/-components/` | Not a route | Private components/hooks |
| `$.tsx` | `routes/docs/$.tsx` | `/docs/a/b/c` | Catch-all |

For complete details on file-based routing conventions, see the docs on [file-naming conventions](https://tanstack.com/router/latest/docs/framework/react/routing/file-naming-conventions).

### Finding the Right Layout Pattern

I tried three different layout approaches before landing on one that worked:

**First attempt: Pathless layouts (`_authenticated/`)**. Great for applying auth guards without affecting URLs, but I kept hitting route conflicts. A pathless layout like `_authenticated/dashboard.tsx` creates `/dashboard`, but if you also have `dashboard.tsx` at root, you get duplicate routes and a cryptic error. Managing which routes go inside vs outside the pathless layout became a maintenance nightmare.

**Second attempt: Route groups (`(auth)/`)**. These are purely for organization—they don't affect URLs and don't create route segments. Perfect for grouping related files, but you can't add a `route.tsx` for shared layouts or guards. Dead end.

**Final approach: Feature-based `route.tsx` as layouts**. Each feature gets its own directory with a `route.tsx` file that we use as a layout. `/chat/route.tsx` wraps all chat routes, `/settings/route.tsx` wraps all settings. Clean, predictable, and you can colocate relevant components using the private `-components/` convention.

Here's what the final structure looks like:

```ansi
apps/web/src/routes/
├── __root.tsx                    # Global layout, context, error boundary
├── index.tsx                     # Landing page
├── docs.tsx                      # Static page
├── privacy.tsx                   # Static page
├── auth/
│   ├── sign-in.tsx               # Auth page (public)
│   └── -components/              # Auth-specific components
│       └── sign-in-form.tsx
├── chat/
│   ├── route.tsx                 # Layout route (shared chat shell)
│   ├── $chatId.tsx               # Individual chat page
│   ├── -components/              # Chat-specific components
│   │   ├── chat-shell.tsx
│   │   ├── message-input.tsx
│   │   ├── message-renderer.tsx
│   │   └── chat-error.tsx
│   └── -hooks/                   # Chat-specific hooks
│       ├── use-chat-model-selector.ts
│       └── use-pending-message.ts
└── settings/
    ├── route.tsx                 # Layout route (settings shell)
    ├── profile.tsx               # Settings sub-pages
    ├── models.tsx
    ├── providers.tsx
    ├── tools.tsx
    └── -components/              # Settings-specific components
        ├── settings-error.tsx
        └── profile/
            ├── session-card.tsx
            └── delete-account-dialog.tsx
```

This structure works well because it enables feature colocation (everything related to `chat` lives under `/routes/chat/`), layouts via `route.tsx` (parent routes define shared UI and guards for their children), private components scoped to each route feature (`-components/`), clear boundaries (each major feature has its own directory), and a flat hierarchy where possible (static pages stay at the top level).

### Parents as Layouts: The Key Pattern

Parent routes created with `route.tsx` let you share auth guards, loading states, error boundaries, and UI across multiple child routes. This is what we're choosing to rely on for our "layout" routes.

```tsx
// Parent Layout - routes/chat/route.tsx
export const Route = createFileRoute('/chat')({
  beforeLoad: (opts) => {
    requireAuthenticated({ auth: opts.context.auth, location: opts.location })
  },
  component: () => <ChatShell><Outlet /></ChatShell>,
  pendingComponent: AppShellSkeleton,
  errorComponent: ChatError,
})
```


Now ALL child routes (`/chat/$chatId`, `/chat/settings`, etc.) inherit:
- Auth protection (no need to repeat the guard)
- Loading state (`AppShellSkeleton`)
- Error handling (`ChatError`)
- Shared layout (`ChatShell`)

By checking auth once in the parent's `beforeLoad`, child routes inherit protection without repeating guard logic. Better Auth's `useSession` hook is called exactly once in `AuthProvider`, then accessed everywhere via router context—zero redundant session fetches.

Child routes just focus on their specific data and rendering:

```tsx
// Child inherits parent's guards - /routes/chat/$chatId.tsx
export const Route = createFileRoute('/chat/$chatId')({
  loader: async ({ params, context }) => {
    // Prefetch data in parallel
    await Promise.all([
      context.queryClient.ensureQueryData(/* messages */),
      context.queryClient.ensureQueryData(/* conversation */),
    ])
  },
  component: ChatPage,
  pendingComponent: ChatPageSkeleton,
})
```

The `loader` function prefetches data before the component renders, eliminating loading waterfalls.

### Layout with No Index

A `route.tsx` component is a parent that wraps its children with `<Outlet />`, while `index.tsx` renders content at the exact parent path. We skip `index.tsx` entirely (except the guest landing at `/`).

For `/chat`, we use conditional rendering: show new chat UI when no child is active, or `<Outlet />` when viewing `/chat/:chatId`. For `/settings`, we redirect to `/settings/profile`. Both avoid needing a separate `index.tsx` file.

Without specifically adding a redirect, visiting `/settings` would render an empty shell. We prevent this by redirecting to a default child in `beforeLoad`:

```tsx
// /routes/settings/route.tsx
export const Route = createFileRoute('/settings')({
  beforeLoad: (opts) => {
    requireAuthenticated({
      auth: opts.context.auth,
      location: opts.location,
    })

    // Redirect /settings → /settings/profile
    const pathname = opts.location.pathname ?? ''
    if (pathname === '/settings' || pathname === '/settings/') {
      throw redirect({ to: '/settings/profile', replace: true })
    }
  },
  component: SettingsLayout,
  pendingComponent: AppShellSkeleton,
  errorComponent: SettingsError,
})
```

Redirecting in `beforeLoad` instead of `useEffect` offers several advantages. It happens before the component renders (no flash of layout before redirect), works with server-side rendering if you add it, keeps code cleaner (no hooks, no component-level redirect logic), and ensures consistency by keeping all navigation decisions in the same place.

Compare to the `useEffect` approach:

```tsx
// ❌ Don't do this
function SettingsLayout() {
  const navigate = useNavigate()
  const location = useRouterState({ select: (state) => state.location })

  useEffect(() => {
    const pathname = location.pathname ?? ''
    if (pathname === '/settings' || pathname === '/settings/') {
      navigate({ to: '/settings/profile', replace: true })
    }
  }, [location.pathname, navigate])

  return <SettingsShell><Outlet /></SettingsShell>
}
```

This works, but:
- Component mounts and renders before redirecting
- User might see a flash of the empty settings layout
- Logic is in the component instead of route configuration
- Not SSR-compatible

The `beforeLoad` approach is cleaner and more aligned with TanStack Router's design.

---
## Skeleton #2: Auth Flash

Now that we have a solid route structure, let's tackle the dreaded flash, the most insidious bug in authentication flows.

### The Problem: Race Conditions & Redirect Loops

Here's what our initial authentication guard looked like.

```tsx
// ❌ Naive implementation
export function requireAuthenticated({ auth, location }) {
  if (!auth.isAuthenticated) {
    throw redirect({
      to: '/auth/sign-in',
      search: { redirect: location.href }
    })
  }
}
```

Looks reasonable, right? But in production, the following race condition occurs.

1. User navigates to `/chat` (protected route)
2. Auth session is still fetching from the server
3. `isAuthenticated` is `false` (session hasn't loaded yet)
4. Guard redirects to `/auth/sign-in`
5. User sees sign-in page briefly
6. Auth session finishes loading, user is actually authenticated
7. Another redirect back to `/chat`

The result is a jarring flash between pages. Feels broken, even though it eventually works.

The breakthrough was realizing that **auth has three states, not two**:

1. **Loading** (`isPending: true`)
2. **Authed** (`isPending: false, isAuthenticated: true`)
3. **Unauthed** (`isPending: false, isAuthenticated: false`). Our naive guard only handled the latter two.

### The Solution: Block Until Auth Resolves

Better Chat blocks the entire app from rendering until auth state is known, eliminating race conditions entirely.

```tsx
// apps/web/src/components/auth-provider.tsx
export function AuthProvider({ children }: PropsWithChildren) {
  const { data: session, isPending, error } = authClient.useSession()

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: !!session?.user,
      session: session ?? null,
      isPending,
    }),
    [session, isPending]
  )

  if (error) {
    console.error('Failed to fetch auth session', error)
  }

  // Block rendering until auth resolves
  if (isPending) {
    return (
      <div className="relative min-h-screen bg-background">
        <AppBackground />
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
```

While `isPending === true`, show a blank screen with our app background image (the block is so brief that a proper loading spinner would reintroduce the flash we're avoiding). Once resolved, Tanstack's RouterProvider mounts and guards execute with **guaranteed resolved auth**.

This makes our route guards remarkably simple:

```tsx
// apps/web/src/lib/route-guards.ts
export function requireAuthenticated({ auth, location }) {
  // No isPending check needed - always resolved by this point
  if (!auth.isAuthenticated) {
    throw redirect({
      to: '/auth/sign-in',
      replace: true,
      search: { redirect: location.href }
    })
  }
}

export function redirectIfAuthenticated({ auth, to }) {
  // No isPending check needed - always resolved by this point
  if (auth.isAuthenticated) {
    throw redirect({ to, replace: true })
  }
}
```

### Why Blocking Works: Cookie Cache + Zero Race Conditions

Blocking eliminates race conditions entirely while staying fast thanks to the server-side session `cookieCache` provided by Better Auth.

```tsx
// apps/server/src/lib/auth.ts
export const auth = betterAuth({
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    }
  }
})
```

- First session check: database query + signed cookie (100-300ms)
- Subsequent checks within 5 minutes: cookie read only (~10-50ms).

This makes the blocking pattern viable; only the very first load is a little slower.

**Benefits:**
- Zero race conditions (guards never see incomplete auth)
- Simpler guards (no `isPending` checks)
- Fast after first load (cookie cache)
- Clean UX (brief blank screen beats redirect flashes)
- Less code, fewer edge cases

**Tradeoff:** Brief blank screen on initial load for guaranteed correctness.

### Alternative: Non-Blocking with Component-Level Handling

If you need progressive rendering during auth load, you can handle `isPending` at the component level, instead.

```tsx
// Don't block in provider
export function AuthProvider({ children }) {
  const { data: session, isPending } = authClient.useSession()

  // Router mounts immediately, even while auth loads
  return (
    <AuthContext.Provider value={{ isPending, isAuthenticated: !!session?.user, session }}>
      {children}
    </AuthContext.Provider>
  )
}

// Guards check auth without isPending (will redirect early if needed)
export function requireAuthenticated({ auth, location }) {
  if (!auth.isAuthenticated) {
    throw redirect({ to: '/auth/sign-in' })
  }
}

// Components handle isPending state
function ChatPage() {
  const auth = useAuth()

  // Show loading skeleton while auth resolves
  if (auth.isPending) {
    return <AppShellSkeleton />
  }

  // Auth guaranteed resolved - render actual content
  return <ChatShell>...</ChatShell>
}
```

The non-blocking approach offers progressive rendering (header, nav, and static content can show during auth load), lets components control their own loading states, and provides more flexible per-component UX. However, you must handle `isPending` in every protected component, and it's easy to introduce race conditions. Guards might also redirect before auth finishes (causing the flash between pages that was our priority to eliminate).

Choose blocking for guaranteed flash-free simplicity, or choose non-blocking for progressive rendering during initial load.

### Building the Complete Auth System

Let's walk through the pieces needed for our blocking auth pattern.

#### 1. AuthProvider: Block Until Resolved

```tsx
// apps/web/src/components/auth-provider.tsx
export function AuthProvider({ children }: PropsWithChildren) {
  const { data: session, isPending, error } = authClient.useSession()  // ← Only place we call this

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: !!session?.user,
      session: session ?? null,
      isPending,
    }),
    [session, isPending]
  )

  if (error) {
    console.error('Failed to fetch auth session', error)
  }

  // Block rendering until auth resolves
  if (isPending) {
    return (
      <div className="relative min-h-screen bg-background">
        <AppBackground />
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
```

Call `useSession` once here to create a single source of truth. Blocking guarantees RouterProvider never mounts while `isPending === true`.

#### 2. Router Context: Wire Auth to Routes

```tsx
// apps/web/src/routes/__root.tsx
export interface RouterAppContext {
  orpc: typeof orpc
  queryClient: QueryClient
  auth: AuthContextValue  // ← Auth available to all routes
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: ErrorBoundary,
})

// apps/web/src/main.tsx
function AppRouter() {
  const auth = useAuth()  // From AuthContext
  const routerContext = useMemo(() => ({ orpc, queryClient, auth }), [auth])

  return <RouterProvider router={router} context={routerContext} />
}

root.render(
  <AuthProvider>
    <AppRouter />
  </AuthProvider>
)
```

This makes `auth` available in every route's `beforeLoad` via `opts.context.auth`.

#### 3. Route Guards

With auth guaranteed resolved before guards run, no `isPending` checks needed:

```tsx
// apps/web/src/lib/route-guards.ts
export function requireAuthenticated({ auth, location }) {
  if (!auth.isAuthenticated) {
    const redirectTarget = location.href ?? location.pathname ?? '/'
    throw redirect({
      to: '/auth/sign-in',
      replace: true,
      search: { redirect: redirectTarget },
    })
  }
}

export function redirectIfAuthenticated({ auth, to }) {
  if (auth.isAuthenticated) {
    throw redirect({ to, replace: true })
  }
}
```

```tsx
// apps/web/src/routes/chat/route.tsx - Protected route
export const Route = createFileRoute('/chat')({
  beforeLoad: (opts) => {
    requireAuthenticated({
      auth: opts.context.auth,
      location: opts.location,
    })
  },
  component: ChatLayout,
  pendingComponent: AppShellSkeleton,  // Shows during data loading (not auth)
})
```

```tsx
// apps/web/src/routes/auth/sign-in.tsx - Public route
export const Route = createFileRoute('/auth/sign-in')({
  beforeLoad: (opts) => {
    redirectIfAuthenticated({
      auth: opts.context.auth,
      to: opts.search.redirect || '/chat',
    })
  },
  component: SignInRoute,
  pendingComponent: SignInShellSkeleton,
})
```

#### 4. When Do pendingComponents Actually Show?

With blocking, `pendingComponent` handles **data loading and navigation**, not initial auth:

```tsx
// /chat/$chatId.tsx
export const Route = createFileRoute('/chat/$chatId')({
  loader: async ({ params, context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(...),
      context.queryClient.ensureQueryData(...),
    ])
  },
  pendingComponent: ChatPageSkeleton,  // Shows during loader
})
```

Auth blocks once at startup, then `pendingComponent` handles route transitions.

#### 5. Component UI State: Simple and Clean

Since it's all handles upstream, all other components can trust auth is always resolved.

```tsx
// apps/web/src/components/navigation/user-menu.tsx
export function UserMenu() {
  const auth = useAuth()
  const navigate = useNavigate()

  if (!auth.isAuthenticated) {
    return (
      <Button variant="outline" onClick={() => navigate({ to: '/auth/sign-in' })}>
        Sign In
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">{auth.session?.user?.name}</Button>
      </DropdownMenuTrigger>
      {/* Menu items */}
    </DropdownMenu>
  )
}
```

---

## Skeleton #3: Frontend Polish

With route structure and auth sorted, let's tackle three quick wins for production-ready UX that came up on my journey.

### Loading States: Always Show Something

**The problem:** Blank screens during navigation feel broken.

**The solution:** Every route should have a `pendingComponent`:

```tsx
export const Route = createFileRoute('/chat/$chatId')({
  loader: async ({ params, context }) => {
    // Prefetch critical data
    await context.queryClient.ensureQueryData(...)
  },
  pendingComponent: ChatPageSkeleton,  // Shown during loader
  component: ChatPage,  // Rendered after loader
})
```

When building skeletons, match the final layout structure, use simple rectangles for dynamic content, and match static content exactly to minimize visual flicker.

### Error Boundaries: Graceful Failures

**The problem:** One bug crashes the entire app.

**The solution:** Root error boundary + route-specific errors:

```tsx
// Root catch-all
export const Route = createRootRouteWithContext<RouterAppContext>()({
  errorComponent: ErrorBoundary,
})

// Route-specific errors
export const Route = createFileRoute('/chat/$chatId')({
  loader: async ({ params, context }) => {
    const conversation = await fetchConversation(params.chatId)
    if (!conversation) {
      throw new Error('Conversation not found')
    }
  },
  errorComponent: ChatError,  // Custom error UI for this route
})
```

**Error component pattern:**
```tsx
function ChatError({ error }: ErrorComponentProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-4">
        <h2>Conversation not found</h2>
        <p>This conversation may have been deleted.</p>
        {import.meta.env.DEV && <pre>{error.message}</pre>}
        <Button onClick={() => router.navigate({ to: '/chat' })}>
          Start a New Chat
        </Button>
      </div>
    </div>
  )
}
```

Validate in loaders to fail before component renders, use route-specific errors for better UX than root catch-all, and show error details in dev while hiding them in production.

### Search Params: Validate When You Need Them

**The problem:** Users can manipulate URLs. If you accept search params (especially redirects on auth pages), unvalidated inputs are a security risk.

**When you need this:** Auth routes with redirect params, filtered lists, paginated views—any route accepting user-controlled URL parameters.

**The solution:** Use `validateSearch` to sanitize inputs. Here's how Better Chat handles the sign-in page:

```tsx
// /routes/auth/sign-in.tsx
import { createFileRoute } from '@tanstack/react-router'
import { SignInShellSkeleton } from '@/components/skeletons/sign-in-skeleton'
import { redirectIfAuthenticated } from '@/lib/route-guards'
import { SignInForm } from './-components/sign-in-form'

interface SignInSearch {
  redirect?: string
}

const FALLBACK_REDIRECT = '/chat'

function sanitizeRedirect(rawRedirect: string | undefined): string {
  if (!rawRedirect || typeof rawRedirect !== 'string') {
    return FALLBACK_REDIRECT
  }

  // Must be internal path
  if (!rawRedirect.startsWith('/')) {
    return FALLBACK_REDIRECT
  }

  // Prevent redirect loops
  if (rawRedirect === '/auth/sign-in') {
    return FALLBACK_REDIRECT
  }

  return rawRedirect
}

export const Route = createFileRoute('/auth/sign-in')({
  validateSearch: (search: Record<string, unknown>): SignInSearch => {
    const redirectValue = sanitizeRedirect(search.redirect as string | undefined)

    // Only include redirect in search if it's not the default
    if (redirectValue === FALLBACK_REDIRECT) {
      return {}
    }

    return { redirect: redirectValue }
  },

  beforeLoad: (opts) => {
    redirectIfAuthenticated({
      auth: opts.context.auth,
      to: opts.search.redirect || FALLBACK_REDIRECT,  // Type-safe!
    })
  },

  component: SignInRoute,
  pendingComponent: SignInShellSkeleton,
})

function SignInRoute() {
  const search = Route.useSearch()  // Type-safe: SignInSearch

  return (
    <div className="container mx-auto max-w-md">
      <SignInForm redirectPath={search.redirect || FALLBACK_REDIRECT} />
    </div>
  )
}
```

When using search params, validate any user-controlled inputs, sanitize redirects by only allowing internal paths and preventing loops, use type-safe schemas (Zod + `zodValidator` for complex validation), and validate at the route level rather than in components.

---

## Conclusion

Building production-grade authentication with TanStack Router isn't about knowing every API—it's about understanding how the pieces fit together.

### What We Covered

**Route Organization & File-Based Routing**
- File-based routing conventions (`$param`, `route.tsx`, `_pathless/`, `-folder/`)
- Using `route.tsx` parent routes as layouts for shared UI and auth guards
- Feature-based colocation with `-components/` and `-hooks/`
- Redirects in `beforeLoad`, not `useEffect`
- Data prefetching with loaders to eliminate waterfalls

**Zero-Flash Auth (Blocking Pattern)**
- Block rendering until auth resolves (eliminates race conditions)
- Server cookie cache makes blocking fast after initial load
- Single `useSession` call in AuthProvider, accessible via router context
- Simple guards without `isPending` checks

**Polish & Production Patterns**
- Every route needs `pendingComponent` for loading states
- Root + route-specific error boundaries for graceful failures
- Validate and sanitize all search params (security)
- Loaders prefetch data in parallel with `Promise.all`

### Everything in its Right Place

TanStack Router and Better Auth are both flexible libraries. They give you primitives and trust you to use them correctly. The patterns in this article aren't the *only* way to build your frontend routing and authentication loading, but they're approaches that I have found to work well in production.

The key insight is to **use ALL the features, in the right places, for the right reasons**. Each feature in a library you're using has a specific job; figure out what those are and use them! Use `beforeLoad` for guards and redirects (before render), `validateSearch` for search param validation (type safety), `loader` for data prefetching (eliminate waterfalls), `pendingComponent` for loading states (smooth UX), `errorComponent` for error handling (graceful recovery), and `component` for rendering (clean, with data ready).

Skip one, and you introduce bugs. Overlap responsibilities, and you create confusion. Use them all correctly, and you get a production-ready architecture that's maintainable, performant, and delightful for users.

### The Blocking vs Non-Blocking Choice

Choose blocking for simplicity and zero race conditions (brief initial blank screen), or non-blocking for progressive rendering (handle `isPending` in every component). Better Chat chose blocking—cookie cache keeps it fast, preventing auth bugs is worth the minimal delay.

### Next Steps

1. **Audit your routes** - Does every route have `pendingComponent` and `errorComponent`?
2. **Choose your auth pattern** - Blocking (simpler, zero race conditions) or non-blocking (progressive rendering)?
3. **Enable cookie cache** - Add `cookieCache` to Better Auth config for faster subsequent loads
4. **Move redirects** - Are redirects in `beforeLoad` or still in `useEffect`?
5. **Add validation** - Are search params validated and sanitized?
6. **Prefetch data** - Can any routes use loaders to eliminate waterfalls?

Start with one pattern. Add them incrementally. Before you know it, you'll have a rock-solid authentication flow that scales.

---

## Further Reading

### TanStack Router Documentation

**Route Organization & File-Based Routing:**
- [File Naming Conventions](https://tanstack.com/router/latest/docs/framework/react/routing/file-naming-conventions) - Pathless routes, route groups, dynamic params, private folders
- [Route Trees](https://tanstack.com/router/latest/docs/framework/react/routing/route-trees) - Understanding route hierarchy and layouts

**Authentication & Data Loading:**
- [Authenticated Routes Guide](https://tanstack.com/router/latest/docs/framework/react/guide/authenticated-routes) - Official patterns for protecting routes
- [Data Loading](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading) - Using loaders and handling loading states
- [Search Params](https://tanstack.com/router/latest/docs/framework/react/guide/search-params) - Validating and type-safe search parameters

**API Reference:**
- [Route Options](https://tanstack.com/router/latest/docs/framework/react/api/router/RouteOptionsType) - `beforeLoad`, `loader`, `pendingComponent`, `errorComponent`, `validateSearch`

### Better Auth Documentation

- [Session Management](https://www.better-auth.com/docs/concepts/session-management) - Understanding sessions and authentication state
- [Performance Optimization](https://www.better-auth.com/docs/guides/optimizing-for-performance) - Using the `useSession` hook and React components

### Implementation Reference

Want to see these patterns in action? The complete Better Chat implementation is open source:

- **Parent layout route**: [apps/web/src/routes/chat/route.tsx](https://github.com/oscabriel/better-chat/blob/main/apps/web/src/routes/chat/route.tsx)
- **Child data-loading route**: [apps/web/src/routes/chat/$chatId.tsx](https://github.com/oscabriel/better-chat/blob/main/apps/web/src/routes/chat/%24chatId.tsx)
- **Route guards**: [apps/web/src/lib/route-guards.ts](https://github.com/oscabriel/better-chat/blob/main/apps/web/src/lib/route-guards.ts)
- **Auth context**: [apps/web/src/lib/auth-context.tsx](https://github.com/oscabriel/better-chat/blob/main/apps/web/src/lib/auth-context.tsx)
- **Component-Level Loading**: [apps/web/src/components/navigation/user-menu.tsx](https://github.com/oscabriel/better-chat/blob/main/apps/web/src/components/navigation/user-menu.tsx)
- **Chat shell component**: [apps/web/src/routes/chat/-components/chat-shell.tsx](https://github.com/oscabriel/better-chat/blob/main/apps/web/src/routes/chat/-components/chat-shell.tsx)

---

*Thanks for reading! This was part two (of two) on how I built Better Chat. Check out the previous [blog post](https://oscargabriel.dev/blog/two-brains-are-better) if you missed it, all about the two-brained backend architecture of the app.*

*Next up, my sights are set on the ongoing [Tanstack Start Hackathon](https://www.convex.dev/hackathons/tanstack) hosted by Convex! Keep an eye out for my submission. 👀*
