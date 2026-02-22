import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../../components/layout/Navbar';
import Dropzone from '../../components/common/Dropzone';
import { FileText, CheckCircle, Clock, XCircle, PenTool, Share2, Trash2, Eye, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const [documents, setDocuments] = useState([]);
    const [sharedDocuments, setSharedDocuments] = useState([]);
    const [activeTab, setActiveTab] = useState('my'); // 'my' or 'shared'
    const [loading, setLoading] = useState(true);
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    const fetchDocuments = async () => {
        try {
            const [myDocs, sharedDocs] = await Promise.all([
                axios.get('/api/docs', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/docs/shared', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setDocuments(myDocs.data);
            setSharedDocuments(sharedDocs.data);
        } catch (error) {
            console.error('Error fetching docs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleUploadInit = (newDoc) => {
        setDocuments([newDoc, ...documents]);
    };

    const [showShareModal, setShowShareModal] = useState(false);
    const [shareEmail, setShareEmail] = useState('');
    const [sharePermission, setSharePermission] = useState('view');
    const [shareMessage, setShareMessage] = useState('');
    const [currentDocId, setCurrentDocId] = useState(null);

    const openShareModal = (docId) => {
        setCurrentDocId(docId);
        setCurrentDocId(docId);
        setShareEmail('');
        setSharePermission('view');
        setShareMessage('');
        setShowShareModal(true);
    };

    const closeShareModal = () => {
        setShowShareModal(false);
        setCurrentDocId(null);
        setShareEmail('');
        setShareMessage('');
    };

    const handleShareSubmit = async () => {
        if (!shareEmail) return alert("Please enter an email address.");

        try {
            await axios.post(`/api/docs/${currentDocId}/share`, {
                email: shareEmail,
                permission: sharePermission,
                message: shareMessage
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Invitation sent successfully!");
            closeShareModal();
        } catch (error) {
            console.error(error);
            alert("Failed to send invitation.");
        }
    };

    const handleDelete = async (docId) => {
        if (!window.confirm("Are you sure you want to delete this document?")) return;
        try {
            await axios.delete(`/api/docs/${docId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDocuments(documents.filter(d => d._id !== docId));
        } catch (error) {
            console.error(error);
            alert("Failed to delete document");
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Signed': return <CheckCircle className="text-green-500" />;
            case 'Rejected': return <XCircle className="text-red-500" />;
            default: return <Clock className="text-yellow-500" />;
        }
    };

    const [filterStatus, setFilterStatus] = useState('All'); // 'All', 'Pending', 'Signed', 'Rejected'

    // Calculate Stats
    const stats = {
        total: documents.length,
        pending: documents.filter(d => d.status === 'Pending').length,
        signed: documents.filter(d => d.status === 'Signed').length,
        rejected: documents.filter(d => d.status === 'Rejected').length,
    };

    const getFilteredDocuments = () => {
        let docs = activeTab === 'my' ? documents : sharedDocuments;
        if (filterStatus !== 'All') {
            docs = docs.filter(d => d.status === filterStatus);
        }
        return docs;
    };

    const displayedDocs = getFilteredDocuments();

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                        <p className="mt-1 text-gray-600">Manage your documents.</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow cursor-pointer hover:bg-gray-50" onClick={() => setFilterStatus('All')}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Documents</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                            </div>
                            <FileText className="h-8 w-8 text-blue-500" />
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow cursor-pointer hover:bg-gray-50" onClick={() => setFilterStatus('Pending')}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Pending</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                            </div>
                            <Clock className="h-8 w-8 text-yellow-500" />
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow cursor-pointer hover:bg-gray-50" onClick={() => setFilterStatus('Signed')}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Signed</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.signed}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-500" />
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow cursor-pointer hover:bg-gray-50" onClick={() => setFilterStatus('Rejected')}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Rejected</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
                            </div>
                            <XCircle className="h-8 w-8 text-red-500" />
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6">
                    <button
                        onClick={() => { setActiveTab('my'); setFilterStatus('All'); }}
                        className={`py-2 px-4 font-medium text-sm focus:outline-none ${activeTab === 'my' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        My Documents
                    </button>
                    <button
                        onClick={() => { setActiveTab('shared'); setFilterStatus('All'); }}
                        className={`py-2 px-4 font-medium text-sm focus:outline-none ${activeTab === 'shared' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Shared with Me
                    </button>
                </div>

                {/* Status Filter Label */}
                {filterStatus !== 'All' && (
                    <div className="mb-4 flex items-center">
                        <span className="text-sm text-gray-600 mr-2">Filtering by:</span>
                        <span className="px-3 py-1 rounded-full bg-gray-200 text-sm font-medium flex items-center">
                            {filterStatus}
                            <button onClick={() => setFilterStatus('All')} className="ml-2 hover:text-red-500"><XCircle size={14} /></button>
                        </span>
                    </div>
                )}

                {/* Upload Section (Only for My Documents) */}
                {activeTab === 'my' && filterStatus === 'All' && (
                    <div className="bg-white p-6 rounded-lg shadow mb-8">
                        <h2 className="text-lg font-semibold mb-4">Upload New Document</h2>
                        <Dropzone onUpload={handleUploadInit} />
                    </div>
                )}

                {/* Documents List */}
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    {loading ? (
                        <div className="p-6 text-center text-gray-500">Loading documents...</div>
                    ) : displayedDocs.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">No documents found.</div>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {displayedDocs.map((doc) => (
                                <li key={doc._id} className="p-6 hover:bg-gray-50 transition">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <FileText className="h-8 w-8 text-blue-500 mr-4" />
                                            <div>
                                                <Link to={`/docs/${doc._id}`} className="text-sm font-medium text-blue-600 truncate hover:underline">
                                                    {doc.fileName}
                                                </Link>
                                                <p className="text-xs text-gray-500">
                                                    {activeTab === 'my' ? `Uploaded on ${new Date(doc.createdAt).toLocaleDateString()}` : `Shared with you`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-gray-100 text-sm mr-2">
                                                {getStatusIcon(doc.status)}
                                                <span>{doc.status}</span>
                                            </div>

                                            {/* View / Details Button */}
                                            <Link
                                                to={`/docs/${doc._id}`}
                                                className="text-gray-500 hover:text-blue-600 p-2"
                                                title="View Details"
                                            >
                                                <Eye className="h-5 w-5" />
                                            </Link>

                                            {/* Audit Log Link (Redundant but keeping for quick access if wanted, or remove) */}
                                            {/* Removing specific audit link as it is in details now, or could keep it pointing to details? Let's remove to clean up UI */}

                                            {/* Edit/Sign Button (My Docs Only and Pending) */}
                                            {activeTab === 'my' && doc.status === 'Pending' && (
                                                <Link
                                                    to={`/sign/${doc._id}`}
                                                    className="text-gray-500 hover:text-green-600 p-2"
                                                    title="Edit/Sign"
                                                >
                                                    <PenTool className="h-5 w-5" />
                                                </Link>
                                            )}

                                            {/* Share Button (My Docs Only) */}
                                            {activeTab === 'my' && (
                                                <button
                                                    onClick={() => openShareModal(doc._id)}
                                                    className="text-gray-500 hover:text-indigo-600 p-2"
                                                    title="Share"
                                                >
                                                    <Share2 className="h-5 w-5" />
                                                </button>
                                            )}

                                            {/* Delete Button (My Docs Only) */}
                                            {activeTab === 'my' && (
                                                <button
                                                    onClick={() => handleDelete(doc._id)}
                                                    className="text-gray-500 hover:text-red-600 p-2"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Share Modal */}
            {showShareModal && (
                <div className="fixed z-50 inset-0 overflow-y-auto">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-50">
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
                                    onClick={closeShareModal}
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

export default Dashboard;
