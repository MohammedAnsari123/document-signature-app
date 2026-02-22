import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Loader2, LogIn, FileText, Shield } from 'lucide-react';

/**
 * PublicSign — handles /share/:token
 *
 * Flow:
 *  1. Not logged in  → show login prompt (redirects to /login?redirect=/share/<token>)
 *  2. Logged in      → resolve the token → redirect to /sign/<docId>
 *                      which is the full SignatureEditor with the user's permissions
 */
const PublicSign = () => {
    const { token } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [docName, setDocName] = useState('');

    const authToken = localStorage.getItem('token');
    const isLoggedIn = Boolean(authToken);

    useEffect(() => {
        const resolveShare = async () => {
            if (!isLoggedIn) {
                // Not logged in — just show the landing/login prompt, stop loading
                setLoading(false);
                return;
            }

            // Logged in — resolve the share token to get the document id
            try {
                const res = await axios.get(`/api/docs/public/${token}`);
                const doc = res.data;
                setDocName(doc.fileName || 'Document');

                // Small pause so user can see the loading screen
                await new Promise(r => setTimeout(r, 600));

                // Redirect to the full SignatureEditor (authenticated route)
                navigate(`/sign/${doc._id}`, { replace: true });
            } catch (err) {
                console.error(err);
                if (err.response?.status === 404 || err.response?.status === 401) {
                    setError('This share link is invalid or has expired.');
                } else {
                    setError('Failed to load the document. Please try again.');
                }
                setLoading(false);
            }
        };

        resolveShare();
    }, [token, isLoggedIn, navigate]);

    // ── Loading state ──────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Opening document{docName ? `: ${docName}` : '...'}</p>
                </div>
            </div>
        );
    }

    // ── Error state ────────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-white p-8 rounded-xl shadow text-center max-w-sm">
                    <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                        <FileText className="h-7 w-7 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Link Unavailable</h2>
                    <p className="text-gray-500 text-sm mb-6">{error}</p>
                    <Link to="/dashboard" className="text-blue-600 text-sm hover:underline">
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    // ── Not logged in — Login prompt ───────────────────────────────────────────
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4">
                {/* Icon */}
                <div className="flex items-center justify-center mb-6">
                    <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                        <Shield className="h-8 w-8 text-blue-600" />
                    </div>
                </div>

                {/* Heading */}
                <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
                    Document Shared With You
                </h1>
                <p className="text-gray-500 text-sm text-center mb-6">
                    You've been invited to view or sign a document.
                    Please log in to continue.
                </p>

                {/* CTA buttons */}
                <Link
                    to={`/login?redirect=/share/${token}`}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors mb-3"
                >
                    <LogIn className="h-5 w-5" />
                    Log In to Continue
                </Link>

                <Link
                    to={`/register?redirect=/share/${token}`}
                    className="w-full flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                    Create an Account
                </Link>

                <p className="text-xs text-gray-400 text-center mt-6">
                    🔒 Your access is secured. This link expires in 7 days.
                </p>
            </div>
        </div>
    );
};

export default PublicSign;
