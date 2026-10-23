import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';

import { AdminPage } from '@/pages/admin';
import { HomePage } from '@/pages/home';
import { RootLayout } from '../layouts/RootLayout';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        // The page itself checks the role and shows the access notice
        // when the user is not an administrator.
        path: 'admin',
        element: <AdminPage />,
      },
      {
        // Unknown routes redirect to the only existing page for now.
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
