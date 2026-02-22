import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../../components/layout/Navbar';
import { Document, Page, pdfjs } from 'react-pdf';
import {
    ArrowLeft, FileText, Calendar, User, CheckCircle,
    XCircle, Clock, Download, Trash2, Shield, PenTool, Share2, AlertTriangle, RotateCcw
} from 'lucide-react';

// Setup PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const DocumentDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [doc, setDoc] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('preview'); // 'preview', 'history', 'shared'
    const [numPages, setNumPages] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch specific document
                const docRes = await axios.get(`/api/docs/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const foundDoc = docRes.data;
                setDoc(foundDoc);

                // Only fetch audit logs if owner
                if (foundDoc.ownerId === user._id) {
                    try {
                        const auditRes = await axios.get(`/api/docs/${id}/audit`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        setAuditLogs(auditRes.data);
                    } catch (auditErr) {
                        console.warn("Could not fetch audit logs:", auditErr);
                        // Don't fail the whole page if audit logs fail
                    }
                }
            } catch (err) {
                console.error(err);
                if (err.response && err.response.status === 404) {
                    alert('Document not found');
                } else if (err.response && err.response.status === 401) {
                    alert('Unauthorized access to this document');
                } else {
                    alert('Error loading document details');
                }
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, token, navigate]);

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };

    const handleDownload = () => {
        if (!doc) return;
        const path = doc.status === 'Signed' && doc.signedPath ? doc.signedPath : doc.filePath;
        const link = document.createElement('a');
        link.href = path.startsWith('http') ? path : `https://document-signature-app-u1zd.onrender.com/${path.replace(/\\/g, '/')}`;
        link.setAttribute('download', doc.fileName);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this document? This action cannot be undone.")) return;
        try {
            await axios.delete(`/api/docs/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            navigate('/dashboard');
        } catch (error) {
            console.error(error);
            alert("Failed to delete document");
        }
    };

    const handleResetSignatures = async () => {
        if (!window.confirm("Clear all signatures from this document? It will go back to Pending status.")) return;
        try {
            await axios.delete(`/api/docs/${id}/signatures`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Refresh
            const docRes = await axios.get(`/api/docs/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setDoc(docRes.data);
            alert('✅ Signatures cleared. You can now re-sign the document.');
        } catch (error) {
            console.error(error);
            alert("Failed to reset signatures: " + (error.response?.data?.message || error.message));
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) return alert("Please provide a reason for rejection.");
        try {
            await axios.put(`/api/docs/${id}/reject`, { reason: rejectReason }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowRejectModal(false);
            // Refresh data
            const res = await axios.get('/api/docs', { headers: { Authorization: `Bearer ${token}` } });
            setDoc(res.data.find(d => d._id === id));
            const auditRes = await axios.get(`/api/docs/${id}/audit`, { headers: { Authorization: `Bearer ${token}` } });
            setAuditLogs(auditRes.data);
            alert("Document rejected.");
        } catch (error) {
            console.error(error);
            alert("Failed to reject document");
        }
    };

    const [showShareModal, setShowShareModal] = useState(false);
    const [shareEmail, setShareEmail] = useState('');
    const [sharePermission, setSharePermission] = useState('view');
    const [shareMessage, setShareMessage] = useState('');

    const handleShareSubmit = async () => {
        if (!shareEmail) return alert("Please enter an email address.");

        try {
            const res = await axios.post(`/api/docs/${id}/share`, {
                email: shareEmail,
                permission: sharePermission,
                message: shareMessage
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setShowShareModal(false);
            setShareEmail('');
            setShareMessage('');

            // Refresh doc to show updated sharedWith list
            const docRes = await axios.get(`/api/docs/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setDoc(docRes.data);

            if (res.data.emailSent === false) {
                // Email not configured — show the share link so user can copy it
                const proceed = window.confirm(
                    `✅ Access granted!\n\nEmail delivery is not configured on this server, but you can manually share this link:\n\n${res.data.link}\n\nClick OK to copy the link.`
                );
                if (proceed) {
                    navigator.clipboard?.writeText(res.data.link).catch(() => { });
                }
            } else {
                alert("✅ Invitation sent successfully!");
            }
        } catch (error) {
            console.error(error);
            alert("Failed to share document: " + (error.response?.data?.message || error.message));
        }
    };

    const isOwner = doc && user && doc.ownerId === user._id;

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    if (!doc) return <div className="min-h-screen flex items-center justify-center">Document not found</div>;

    const currentPath = doc.status === 'Signed' && doc.signedPath ? doc.signedPath : doc.filePath;
    const fileUrl = currentPath.startsWith('http') ? currentPath : `https://document-signature-app-u1zd.onrender.com/${currentPath.replace(/\\/g, '/')}`;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                            <Link to="/dashboard" className="mr-4 text-gray-500 hover:text-gray-700">
                                <ArrowLeft className="h-6 w-6" />
                            </Link>
                            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                                {doc.fileName}
                            </h2>
                        </div>
                        <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
                            <div className="mt-2 flex items-center text-sm text-gray-500">
                                <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                Created on {new Date(doc.createdAt).toLocaleDateString()}
                            </div>
                            <div className="mt-2 flex items-center text-sm text-gray-500">
                                <User className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                Owned by {isOwner ? 'You' : 'Others'}
                            </div>
                            <div className="mt-2 flex items-center text-sm">
                                {doc.status === 'Signed' ? <CheckCircle className="mr-1.5 h-5 w-5 text-green-500" /> :
                                    doc.status === 'Rejected' ? <XCircle className="mr-1.5 h-5 w-5 text-red-500" /> :
                                        <Clock className="mr-1.5 h-5 w-5 text-yellow-500" />}
                                <span className={`font-medium ${doc.status === 'Signed' ? 'text-green-600' :
                                    doc.status === 'Rejected' ? 'text-red-600' :
                                        'text-yellow-600'
                                    }`}>{doc.status}</span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-5 flex flex-wrap lg:mt-0 lg:ml-4 gap-2">
                        {/* Download — only when signed */}
                        {doc.status === 'Signed' && (
                            <button
                                onClick={handleDownload}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                <Download className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                                Download
                            </button>
                        )}

                        {/* Reject — only for pending */}
                        {isOwner && doc.status === 'Pending' && (
                            <button
                                onClick={() => setShowRejectModal(true)}
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                            >
                                <XCircle className="-ml-1 mr-2 h-5 w-5" />
                                Reject
                            </button>
                        )}

                        {/* Reset signatures — only when signed */}
                        {isOwner && doc.status === 'Signed' && (
                            <button
                                onClick={handleResetSignatures}
                                className="inline-flex items-center px-4 py-2 border border-orange-300 rounded-md shadow-sm text-sm font-medium text-orange-700 bg-white hover:bg-orange-50"
                                title="Clear all signatures and re-sign"
                            >
                                <RotateCcw className="-ml-1 mr-2 h-5 w-5" />
                                Reset Signatures
                            </button>
                        )}

                        {/* Sign Now — always visible for owner */}
                        {isOwner && (
                            <Link
                                to={`/sign/${doc._id}`}
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                                title={doc.status === 'Signed' ? 'Re-sign this document' : 'Sign this document'}
                            >
                                <PenTool className="-ml-1 mr-2 h-5 w-5" />
                                {doc.status === 'Signed' ? 'Re-Sign' : 'Sign Now'}
                            </Link>
                        )}

                        {/* Share */}
                        {isOwner && (
                            <button
                                onClick={() => setShowShareModal(true)}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                <Share2 className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                                Share
                            </button>
                        )}

                        {/* Delete */}
                        {isOwner && (
                            <button
                                onClick={handleDelete}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                            >
                                <Trash2 className="-ml-1 mr-2 h-5 w-5" />
                                Delete
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('preview')}
                                className={`${activeTab === 'preview'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    } w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center`}
                            >
                                <FileText className="mr-2 h-4 w-4" /> Preview
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`${activeTab === 'history'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    } w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center`}
                            >
                                <Shield className="mr-2 h-4 w-4" /> Audit History
                            </button>
                            <button
                                onClick={() => setActiveTab('shared')}
                                className={`${activeTab === 'shared'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    } w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center`}
                            >
                                <Share2 className="mr-2 h-4 w-4" /> Shared With
                            </button>
                        </nav>
                    </div>

                    <div className="p-6">
                        {activeTab === 'preview' ? (
                            <div className="flex justify-center bg-gray-100 p-4 rounded border">
                                <Document
                                    file={fileUrl}
                                    onLoadSuccess={onDocumentLoadSuccess}
                                    className="shadow-lg"
                                >
                                    {Array.from(new Array(numPages), (el, index) => (
                                        <Page
                                            key={`page_${index + 1}`}
                                            pageNumber={index + 1}
                                            width={600}
                                            renderTextLayer={false}
                                            renderAnnotationLayer={false}
                                            className="mb-4"
                                        />
                                    ))}
                                </Document>
                            </div>
                        ) : activeTab === 'history' ? (
                            <div className="flow-root">
                                <ul className="-mb-8">
                                    {auditLogs.map((log, logIdx) => (
                                        <li key={log._id || logIdx}>
                                            <div className="relative pb-8">
                                                {logIdx !== auditLogs.length - 1 ? (
                                                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                                                ) : null}
                                                <div className="relative flex space-x-3">
                                                    <div>
                                                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${log.action.includes('Signed') ? 'bg-green-500' :
                                                            log.action === 'Rejected' ? 'bg-red-500' :
                                                                'bg-blue-500'
                                                            }`}>
                                                            {log.action.includes('Signed') ? <FileText className="h-5 w-5 text-white" /> : <Clock className="h-5 w-5 text-white" />}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                                        <div>
                                                            <p className="text-sm text-gray-500">
                                                                <span className="font-medium text-gray-900">{log.action}</span>
                                                                {' '}by{' '}
                                                                <span className="font-medium text-gray-900">
                                                                    {log.userId ? (log.userId.name || log.userId.email) : 'System/Guest'}
                                                                </span>
                                                            </p>
                                                            {log.details && (
                                                                <p className="text-xs text-gray-400 mt-1">{log.details}</p>
                                                            )}
                                                        </div>
                                                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                                            <time dateTime={log.timestamp}>{new Date(log.timestamp).toLocaleString()}</time>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-medium text-gray-900">Shared With</h3>
                                    {isOwner && (
                                        <button
                                            onClick={() => setShowShareModal(true)}
                                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                        >
                                            <Share2 className="h-4 w-4 mr-1.5 text-gray-400" />
                                            Add Person
                                        </button>
                                    )}
                                </div>
                                {doc.sharedWith && doc.sharedWith.length > 0 ? (
                                    <ul className="divide-y divide-gray-200 border rounded-md">
                                        {doc.sharedWith.map((entry, index) => {
                                            const emailAddr = typeof entry === 'object' ? entry.email : entry;
                                            const permission = typeof entry === 'object' ? entry.permission : 'view';
                                            const canSign = permission === 'edit';
                                            return (
                                                <li key={index} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                                    <div className="flex items-center">
                                                        <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3 flex-shrink-0">
                                                            {emailAddr.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">{emailAddr}</p>
                                                            <p className="text-xs text-gray-400">Invited</p>
                                                        </div>
                                                    </div>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${canSign
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {canSign ? '✏️ Can Sign' : '👁 View Only'}
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <div className="text-center py-8 text-gray-400">
                                        <Share2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                        <p className="text-sm">This document has not been shared with anyone yet.</p>
                                        {isOwner && (
                                            <button
                                                onClick={() => setShowShareModal(true)}
                                                className="mt-3 text-sm text-blue-600 hover:underline"
                                            >
                                                Share now →
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed z-10 inset-0 overflow-y-auto">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                        <AlertTriangle className="h-6 w-6 text-red-600" />
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                            Reject Document
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500 mb-4">
                                                Are you sure you want to reject this document? This status will be permanent.
                                            </p>
                                            <textarea
                                                className="w-full border border-gray-300 rounded p-2 text-sm"
                                                rows="3"
                                                placeholder="Reason for rejection (required)..."
                                                value={rejectReason}
                                                onChange={(e) => setRejectReason(e.target.value)}
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={handleReject}
                                >
                                    Reject
                                </button>
                                <button
                                    type="button"
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={() => setShowRejectModal(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showShareModal && (
                <div className="fixed z-50 inset-0 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        {/* Backdrop — pointer-events-none so it never blocks the modal */}
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 pointer-events-none" aria-hidden="true" />
                        {/* Modal card */}
                        <div className="relative z-10 bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                                        <Share2 className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                            Share Document
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500 mb-4">
                                                Share this document with others via email to request a signature.
                                            </p>
                                            <div className="mb-4">
                                                <label className="block text-gray-700 text-sm font-bold mb-2">Email Address</label>
                                                <input
                                                    type="email"
                                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                                    placeholder="recipient@example.com"
                                                    value={shareEmail}
                                                    onChange={(e) => setShareEmail(e.target.value)}
                                                />
                                            </div>
                                            <div className="mb-4">
                                                <label className="block text-gray-700 text-sm font-bold mb-2">Permission</label>
                                                <select
                                                    className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-white"
                                                    value={sharePermission}
                                                    onChange={(e) => setSharePermission(e.target.value)}
                                                >
                                                    <option value="view">View Only</option>
                                                    <option value="edit">Can Sign (Edit)</option>
                                                </select>
                                            </div>
                                            <div className="mb-4">
                                                <label className="block text-gray-700 text-sm font-bold mb-2">Message (Optional)</label>
                                                <textarea
                                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                                    placeholder="Add a personal message..."
                                                    rows="3"
                                                    value={shareMessage}
                                                    onChange={(e) => setShareMessage(e.target.value)}
                                                ></textarea>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={handleShareSubmit}
                                >
                                    Send Invitation
                                </button>
                                <button
                                    type="button"
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={() => setShowShareModal(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentDetails;
