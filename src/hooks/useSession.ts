import { useEffect } from "react";
import { useNavigate } from "react-router";

import { subscribeToSignOut } from "~/services/auth";

/**
 * For components inside the admin: when the session ends on its own (token
 * expired or revoked, or signed out in another tab) go to the login page with
 * the "expired" notice. A sign-out the user asked for through `signOut()` is
 * not reported, so it does not show the notice.
 */
export function useSession(): void {
  const navigate = useNavigate();
  useEffect(
    () =>
      subscribeToSignOut(() => {
        navigate("/admin/login?reason=expired", { replace: true });
      }),
    [navigate],
  );
}
