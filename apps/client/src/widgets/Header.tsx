import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/authStore';
import { useCartStore } from '../features/cart/cartStore';
import { useState } from 'react';

export function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { totalItems } = useCartStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm group-hover:scale-110 transition-transform">
              S
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-primary-300 bg-clip-text text-transparent">
              ShopVerse
            </span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/catalog" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
              Catalog
            </Link>
            {isAuthenticated && (
              <>
                <Link to="/profile" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                  Profile
                </Link>
                {user?.profile?.role === 'admin' && (
                  <Link to="/admin" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                    Admin
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <Link
                to="/cart"
                className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-fade-in">
                    {totalItems}
                  </span>
                )}
              </Link>
            )}

            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-light hover:bg-white/10 transition-colors text-sm"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold">
                    {user?.profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:block text-slate-300">{user?.profile?.full_name || 'User'}</span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-12 w-48 glass rounded-xl shadow-xl py-2 animate-fade-in">
                    <Link to="/profile" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5">
                      Profile
                    </Link>
                    <Link to="/cart" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5">
                      Cart
                    </Link>
                    <hr className="my-1 border-white/10" />
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/5">
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="px-4 py-1.5 text-sm text-slate-300 hover:text-white transition-colors">
                  Sign In
                </Link>
                <Link to="/register" className="px-4 py-1.5 text-sm bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors">
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button className="md:hidden p-2 rounded-lg hover:bg-white/10" onClick={() => setMenuOpen(!menuOpen)}>
              <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
