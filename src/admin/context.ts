import { createContext } from "react-router";

/** Set by the admin guard (route middleware) once it has confirmed an admin. */
export const adminContext = createContext<{ email: string } | null>(null);
