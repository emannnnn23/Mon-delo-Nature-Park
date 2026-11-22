import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";

import { subscribeToSignOut } from "~/services/auth";

/**
 * For components inside the admin: when the session ends without the user
 * asking (token expired or revoked, or signed out in another tab) go to the
 * login page with a "you've been signed out" notice and the current path as
 * `next`. Supabase gives no way to tell those causes apart. A sign-out the user
 * asked for through `signOut()` is not reported, so it shows no notice.
 */
export function useSession(): void {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(
    () =>
      subscribeToSignOut(() => {
        const next = encodeURIComponent(pathRef.current);
        navigate(`/admin/login?reason=expired&next=${next}`, {
          replace: true,
        });
      }),
    [navigate],
  );
}
