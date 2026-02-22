import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../../components/layout/Navbar';
import { ArrowLeft, Clock, Shield, MapPin, User, FileText } from 'lucide-react';

const AuditPage = () => {
    const { id } = useParams();
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchAudit = async () => {
            try {
                const res = await axios.get(`/api/docs/${id}/audit`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setAuditLogs(res.data);
            } catch (err) {
                console.error(err);
                alert('Failed to fetch audit logs');
            } finally {
                setLoading(false);
            }
        };
        fetchAudit();
    }, [id, token]);

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="mb-6 flex items-center">
                    <Link to="/dashboard" className="text-gray-500 hover:text-gray-700 flex items-center">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Link>
                </div>

                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                            <Shield className="mr-2 h-6 w-6 text-blue-600" />
                            Audit Trail
                        </h2>
                        <p className="mt-1 text-gray-600">
                            Immutable history of actions for this document.
                        </p>
                    </div>

                    {loading ? (
                        <div className="p-6 text-center">Loading history...</div>
                    ) : auditLogs.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">No actions recorded.</div>
                    ) : (
                        <div className="flow-root p-6">
                            <ul className="-mb-8">
                                {auditLogs.map((log, logIdx) => (
                                    <li key={log._id || logIdx}>
                                        <div className="relative pb-8">
                                            {logIdx !== auditLogs.length - 1 ? (
                                                <span
                                                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                                    aria-hidden="true"
                                                />
                                            ) : null}
                                            <div className="relative flex space-x-3">
                                                <div>
                                                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${log.action === 'Signed' || log.action === 'Signed (Public)' ? 'bg-green-500' :
                                                            log.action === 'Rejected' ? 'bg-red-500' :
                                                                'bg-blue-500'
                                                        }`}>
                                                        {log.action === 'Signed' || log.action === 'Signed (Public)' ? <FileText className="h-5 w-5 text-white" /> : <Clock className="h-5 w-5 text-white" />}
                                                    </span>
                                                </div>
                                                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                                    <div>
                                                        <p className="text-sm text-gray-500">
                                                            <span className="font-medium text-gray-900">{log.action}</span>
                                                            {' '}
                                                            by <span className="font-medium text-gray-900">
                                                                {log.userId ? log.userId.name || log.userId.email : (log.user || 'Unknown')}
                                                            </span>
                                                        </p>
                                                        {log.details && (
                                                            <p className="text-xs text-gray-400 mt-1">{log.details}</p>
                                                        )}
                                                    </div>
                                                    <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                                        <div className="flex items-center justify-end">
                                                            <Clock className="h-3 w-3 mr-1" />
                                                            <time dateTime={log.timestamp}>{new Date(log.timestamp).toLocaleString()}</time>
                                                        </div>
                                                        <div className="flex items-center justify-end mt-1 text-xs text-gray-400">
                                                            <MapPin className="h-3 w-3 mr-1" />
                                                            {log.ip || log.ipAddress}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuditPage;
