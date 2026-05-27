// Feature routes for profile
import React from "react";

const ProfilePage = React.lazy(() => import("./pages/ProfilePage"));

export default [
  {
    path: "/profile",
    element: <ProfilePage />,
    // Add children or route guards as needed
  },
];
