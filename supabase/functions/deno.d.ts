// Type declarations for VS Code / Node TypeScript Language Server
// Supabase Edge Functions execute in Deno in the cloud, where 'Deno', 'npm:', and 'jsr:' are native runtime primitives.

declare namespace Deno {
  export interface ServeOptions {
    port?: number
    hostname?: string
    signal?: AbortSignal
  }

  export function serve(
    handler: (request: Request) => Response | Promise<Response>
  ): void

  export function serve(
    options: ServeOptions,
    handler: (request: Request) => Response | Promise<Response>
  ): void

  export const env: {
    get(key: string): string | undefined
    set(key: string, value: string): void
    delete(key: string): void
    toObject(): Record<string, string>
  }
}

declare module 'npm:@supabase/supabase-js@*' {
  export * from '@supabase/supabase-js'
  export { createClient } from '@supabase/supabase-js'
}

declare module 'npm:*' {
  const content: any
  export default content
  export const createClient: typeof import('@supabase/supabase-js').createClient
}

declare module 'jsr:*' {
  const content: any
  export default content
}
