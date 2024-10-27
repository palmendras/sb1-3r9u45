import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized({ req, token }) {
      const path = req.nextUrl.pathname;
      
      // Public routes
      if (path === "/login" || path === "/register") {
        return true;
      }

      // Protected API routes
      if (path.startsWith("/api/")) {
        return !!token;
      }

      return true;
    },
  },
});

export const config = {
  matcher: [
    "/api/posts/:path*",
    "/api/users/:path*",
    "/dashboard/:path*",
  ],
};