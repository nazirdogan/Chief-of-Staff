import { Suspense, ReactNode } from 'react';

/**
 * Wrap any page component that calls useSearchParams(), usePathname(), or
 * useParams() in this component to satisfy Next.js's static prerender requirement.
 *
 * Usage in a page file:
 *
 *   export default function MyPage() {
 *     return <PageSuspense><MyPageContent /></PageSuspense>;
 *   }
 *
 *   function MyPageContent() {
 *     const searchParams = useSearchParams(); // safe inside PageSuspense
 *     ...
 *   }
 */
export function PageSuspense({ children }: { children: ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
