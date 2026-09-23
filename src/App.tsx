import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { isSupabaseConfigured } from './lib/supabase'
import { RequireAuth, RedirectIfAuthed } from './routes/guards'
import { AppLayout } from './components/layout/AppLayout'
import { LoadingScreen } from './components/ui/LoadingScreen'
import { RequireAdmin } from './components/admin/RequireAdmin'

// Eagerly loaded: entry points and the core shopping path, where any loading
// flash on navigation would be felt most.
import { Splash } from './pages/Splash'
import { Welcome } from './pages/Welcome'
import { SetupNotice } from './pages/SetupNotice'
import { NotFound } from './pages/NotFound'
import { Login } from './pages/auth/Login'
import { Register } from './pages/auth/Register'
import { ForgotPassword } from './pages/auth/ForgotPassword'
import { ResetPassword } from './pages/auth/ResetPassword'
import { Home } from './pages/app/Home'
import { Search } from './pages/app/Search'
import { ProductList } from './pages/app/ProductList'
import { ProductDetail } from './pages/app/ProductDetail'
import { Categories } from './pages/app/Categories'
import { CategoryPage } from './pages/app/CategoryPage'
import { Cart } from './pages/app/Cart'

// Lazily loaded: secondary customer screens (visited less often) and the
// entire admin dashboard (never loaded by ordinary shoppers). This keeps the
// admin bundle out of the customer's initial download.
const Checkout = lazy(() => import('./pages/app/Checkout').then((m) => ({ default: m.Checkout })))
const OrderDetail = lazy(() =>
  import('./pages/app/OrderDetail').then((m) => ({ default: m.OrderDetail })),
)
const Orders = lazy(() => import('./pages/app/Orders').then((m) => ({ default: m.Orders })))
const Profile = lazy(() => import('./pages/app/Profile').then((m) => ({ default: m.Profile })))
const Favourites = lazy(() =>
  import('./pages/app/Favourites').then((m) => ({ default: m.Favourites })),
)
const Notifications = lazy(() =>
  import('./pages/app/Notifications').then((m) => ({ default: m.Notifications })),
)

const AdminLayout = lazy(() =>
  import('./components/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })),
)
const AdminOverview = lazy(() =>
  import('./pages/admin/AdminOverview').then((m) => ({ default: m.AdminOverview })),
)
const AdminProducts = lazy(() =>
  import('./pages/admin/AdminProducts').then((m) => ({ default: m.AdminProducts })),
)
const AdminCategories = lazy(() =>
  import('./pages/admin/AdminCategories').then((m) => ({ default: m.AdminCategories })),
)
const AdminInventory = lazy(() =>
  import('./pages/admin/AdminInventory').then((m) => ({ default: m.AdminInventory })),
)
const AdminOrders = lazy(() =>
  import('./pages/admin/AdminOrders').then((m) => ({ default: m.AdminOrders })),
)
const AdminCustomers = lazy(() =>
  import('./pages/admin/AdminCustomers').then((m) => ({ default: m.AdminCustomers })),
)
const AdminAnalytics = lazy(() =>
  import('./pages/admin/AdminAnalytics').then((m) => ({ default: m.AdminAnalytics })),
)
const AdminNotifications = lazy(() =>
  import('./pages/admin/AdminNotifications').then((m) => ({ default: m.AdminNotifications })),
)
const AdminPromotions = lazy(() =>
  import('./pages/admin/AdminPromotions').then((m) => ({ default: m.AdminPromotions })),
)

export default function App() {
  if (!isSupabaseConfigured) return <SetupNotice />

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Splash />} />

        <Route element={<RedirectIfAuthed />}>
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>

        {/* Reachable while holding a recovery session */}
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/products" element={<ProductList />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order/:id" element={<OrderDetail />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/favourites" element={<Favourites />} />
            <Route path="/notifications" element={<Notifications />} />
          </Route>
        </Route>

        <Route path="/index.html" element={<Navigate to="/" replace />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="promotions" element={<AdminPromotions />} />
          <Route path="notifications" element={<AdminNotifications />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
