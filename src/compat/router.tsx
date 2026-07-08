'use client';
/**
 * react-router-dom → Next.js App Router 호환 shim
 *
 * 마이그레이션 시 각 컴포넌트의 import 출처만
 *   'react-router-dom' → '@/compat/router'
 * 로 바꾸면 되도록, 프로젝트에서 실제로 쓰던 API만 Next 방식으로 재구현한다.
 * (Link/NavLink/Navigate/useNavigate/useSearchParams/useLocation/useParams)
 */
import NextLink from 'next/link';
import {
  useRouter,
  usePathname,
  useSearchParams as useNextSearchParams,
  useParams as useNextParams,
} from 'next/navigation';
import { forwardRef, useEffect, type ComponentPropsWithoutRef, type ReactNode } from 'react';

type LinkProps = Omit<ComponentPropsWithoutRef<'a'>, 'href'> & {
  to: string;
  replace?: boolean;
  href?: string;
};

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, href, replace, children, ...rest },
  ref,
) {
  return (
    <NextLink href={to ?? href ?? '#'} replace={replace} ref={ref} {...rest}>
      {children}
    </NextLink>
  );
});

type NavLinkRender = (state: { isActive: boolean }) => string | ReactNode;
type NavLinkProps = Omit<ComponentPropsWithoutRef<'a'>, 'className' | 'children'> & {
  to: string;
  end?: boolean;
  className?: string | NavLinkRender;
  children?: ReactNode | NavLinkRender;
};

export function NavLink({ to, end, className, children, ...rest }: NavLinkProps) {
  const pathname = usePathname() ?? '';
  const isActive = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
  const cls = typeof className === 'function' ? (className({ isActive }) as string) : className;
  const content = typeof children === 'function' ? (children as NavLinkRender)({ isActive }) : children;
  return (
    <NextLink href={to} className={cls} {...rest}>
      {content}
    </NextLink>
  );
}

type NavigateOptions = { replace?: boolean };

export function useNavigate() {
  const router = useRouter();
  return (to: string | number, opts?: NavigateOptions) => {
    if (typeof to === 'number') {
      if (to < 0) router.back();
      else router.forward();
      return;
    }
    if (opts?.replace) router.replace(to);
    else router.push(to);
  };
}

type SetSearchParams = (
  next: URLSearchParams | Record<string, string> | ((prev: URLSearchParams) => URLSearchParams),
) => void;

export function useSearchParams(): [URLSearchParams, SetSearchParams] {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const params = useNextSearchParams();
  const current = new URLSearchParams(params?.toString() ?? '');

  const setSearchParams: SetSearchParams = next => {
    const usp =
      typeof next === 'function'
        ? next(new URLSearchParams(current.toString()))
        : next instanceof URLSearchParams
          ? next
          : new URLSearchParams(next);
    const qs = usp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return [current, setSearchParams];
}

export function useLocation() {
  const pathname = usePathname() ?? '';
  const params = useNextSearchParams();
  const search = params?.toString() ?? '';
  return {
    pathname,
    search: search ? `?${search}` : '',
    hash: '',
    state: null as unknown,
    key: 'default',
  };
}

export function useParams<T extends Record<string, string> = Record<string, string>>() {
  return (useNextParams() ?? {}) as T;
}

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (replace) router.replace(to);
    else router.push(to);
  }, [to, replace, router]);
  return null;
}
