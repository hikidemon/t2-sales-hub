import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';

import { AdminPage } from '@/pages/admin';
import { LoginPage } from '@/pages/login';
import { HomePage } from '@/pages/home';
import { RootLayout } from '@/layouts/RootLayout';

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
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'admin',
        element: <AdminPage />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
