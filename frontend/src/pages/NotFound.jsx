import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <FileQuestion size={80} className="mx-auto mb-6 text-slate-300" />
        <h1 className="text-6xl font-bold text-slate-800 mb-2">404</h1>
        <p className="text-lg text-slate-500 mb-6">Page not found</p>
        <Link to="/" className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
          Go Home
        </Link>
      </div>
    </div>
  );
}
