import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-white/10 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm">
                S
              </div>
              <span className="text-lg font-bold text-white">ShopVerse</span>
            </div>
            <p className="text-slate-400 text-sm max-w-md">
              Premium e-commerce platform delivering exceptional products with a seamless shopping experience.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Shop</h3>
            <ul className="space-y-2">
              <li><Link to="/catalog" className="text-sm text-slate-400 hover:text-primary-400 transition-colors">Catalog</Link></li>
              <li><Link to="/catalog?sort_by=created_at" className="text-sm text-slate-400 hover:text-primary-400 transition-colors">New Arrivals</Link></li>
              <li><Link to="/catalog?sort_by=price&sort_order=asc" className="text-sm text-slate-400 hover:text-primary-400 transition-colors">Best Deals</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Account</h3>
            <ul className="space-y-2">
              <li><Link to="/profile" className="text-sm text-slate-400 hover:text-primary-400 transition-colors">Profile</Link></li>
              <li><Link to="/cart" className="text-sm text-slate-400 hover:text-primary-400 transition-colors">Cart</Link></li>
              <li><Link to="/login" className="text-sm text-slate-400 hover:text-primary-400 transition-colors">Sign In</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 text-center">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} ShopVerse. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
