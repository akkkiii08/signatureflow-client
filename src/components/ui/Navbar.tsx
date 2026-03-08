import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Pen, LogOut, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleLogout = async () => {
    setShowMenu(false);
    await logout();
    toast.success('Signed out');
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5" style={{ background: 'rgba(15,15,23,0.95)', backdropFilter: 'blur(20px)' }}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-xl flex items-center justify-center">
            <Pen className="w-4 h-4 text-gray-900" />
          </div>
          <span className="font-display text-xl font-semibold text-white">SignatureFlow</span>
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-3 rounded-xl px-4 py-2 transition-all border border-white/10 hover:border-white/20"
            style={{ background: showMenu ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)' }}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-sm">{user?.name[0].toUpperCase()}</span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-white leading-tight">{user?.name}</p>
              <p className="text-xs text-slate-400 leading-tight">{user?.email}</p>
            </div>
            <ChevronDown
              className="w-4 h-4 text-slate-400 transition-transform duration-200"
              style={{ transform: showMenu ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>

          {showMenu && (
            <div
              className="absolute right-0 top-full mt-2 w-56 rounded-2xl overflow-hidden animate-fade-in"
              style={{
                background: '#1e1e2e',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
              }}
            >
              {/* Profile section */}
              <div
                className="px-4 py-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-sm">{user?.name[0].toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                    {user?.company && (
                      <p className="text-xs text-amber-400 mt-0.5 truncate">{user.company}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sign out button */}
              <div className="p-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 transition-all"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}