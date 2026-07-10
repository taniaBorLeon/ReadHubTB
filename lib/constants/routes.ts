export const ROUTES = {
  login: "/login",
  register: "/register",
  home: "/",
  upload: "/upload",
  assistant: "/assistant",
  article: (id: string) => `/article/${id}`,
} as const;
