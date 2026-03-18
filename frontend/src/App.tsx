import { Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { AssetsPage } from './pages/AssetsPage'
import { WatchlistPage } from './pages/WatchlistPage'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="/watchlist/:type/:id" element={<WatchlistPage />} />
        <Route path="/assets" element={<AssetsPage />} />
      </Route>
    </Routes>
  )
}

export default App
