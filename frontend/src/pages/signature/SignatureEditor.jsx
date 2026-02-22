import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { DndContext, useDroppable, useDraggable, useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import axios from 'axios';
import Navbar from '../../components/layout/Navbar';
import { Save, Loader2, X, Upload, Type, Plus, Image as ImageIcon } from 'lucide-react';

// Setup PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ─── Droppable PDF Page ───────────────────────────────────────────────────────
const DroppablePage = ({ children, pageNumber }) => {
    const { setNodeRef } = useDroppable({
        id: `droppable-page-${pageNumber}`,
        data: { pageNumber }
    });
    return (
        <div ref={setNodeRef} className="relative inline-block border shadow-lg mb-4">
            {children}
        </div>
    );
};

// ─── Single Placed Item (independently draggable) ────────────────────────────
const PlacedItem = ({ item, onDelete }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `placed-${item.id}`,
    });

    const style = transform
        ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
        : {};

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className="absolute border-2 border-blue-400 bg-white/60 cursor-move touch-none z-20 select-none"
            style={{ left: item.x, top: item.y, ...style }}
        >
            <div className="relative">
                {/* Delete button */}
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 z-50"
                    title="Remove"
                >
                    <X size={11} />
                </button>

                {/* Content */}
                <div className="flex flex-col items-center p-2 min-w-[60px]">
                    {item.type === 'image' && item.content && (
                        <img
                            src={item.content}
                            alt="Signature"
                            className="h-16 w-auto object-contain pointer-events-none"
                        />
                    )}
                    {item.type === 'text' && (
                        <div className="text-blue-900 font-bold text-xl pointer-events-none whitespace-nowrap px-2" style={{ fontFamily: 'cursive' }}>
                            {item.content || 'Sign'}
                        </div>
                    )}
                    <div className="text-[9px] text-gray-500 mt-1 pointer-events-none">
                        {new Date().toLocaleTimeString()}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Sidebar Draggable Preview ───────────────────────────────────────────────
const SidebarDraggableItem = ({ item }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `sidebar-${item.id}`,
        data: { item }
    });

    const style = transform
        ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 }
        : {};

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            style={style}
            className="border-2 border-dashed border-blue-300 rounded p-2 bg-blue-50 cursor-grab active:cursor-grabbing flex flex-col items-center min-w-[80px] touch-none select-none"
            title="Drag onto the PDF page"
        >
            {item.type === 'image' && item.content && (
                <img src={item.content} alt="sig" className="h-10 w-auto object-contain pointer-events-none" />
            )}
            {item.type === 'text' && (
                <span className="text-blue-900 font-bold pointer-events-none whitespace-nowrap text-sm" style={{ fontFamily: 'cursive' }}>
                    {item.content || 'Sign'}
                </span>
            )}
            <span className="text-[9px] text-gray-400 mt-1">{item.type === 'image' ? 'Image' : 'Text'}</span>
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const SignDocument = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [doc, setDoc] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const token = localStorage.getItem('token');

    // ── Sidebar item palette ─────────────────────────────────────────────────
    // sidebarItems: Array of { id, type:'text'|'image', content }
    const [sidebarItems, setSidebarItems] = useState([]);
    const [currentText, setCurrentText] = useState('');

    // ── Placed items on the PDF ──────────────────────────────────────────────
    // placedItems: Array of { id, type, content, x, y, page }
    const [placedItems, setPlacedItems] = useState([]);

    const nextId = useRef(1);
    const getId = () => `item-${nextId.current++}`;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    useEffect(() => {
        const fetchDoc = async () => {
            try {
                const res = await axios.get(`/api/docs/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setDoc(res.data);
            } catch (err) {
                console.error(err);
                if (err.response?.status === 404) alert('Document not found');
                else if (err.response?.status === 401) alert('Unauthorized access');
                else alert('Error loading document');
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetchDoc();
    }, [id, token]);

    // ── Add text item to sidebar ─────────────────────────────────────────────
    const addTextItem = () => {
        if (!currentText.trim()) return;
        setSidebarItems(prev => [...prev, { id: getId(), type: 'text', content: currentText.trim() }]);
        setCurrentText('');
    };

    // ── Upload image → add as sidebar item ──────────────────────────────────
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setSidebarItems(prev => [...prev, { id: getId(), type: 'image', content: reader.result }]);
        };
        reader.readAsDataURL(file);
        e.target.value = ''; // Reset so same file can be re-added
    };

    // ── Remove from sidebar ──────────────────────────────────────────────────
    const removeSidebarItem = (itemId) => {
        setSidebarItems(prev => prev.filter(i => i.id !== itemId));
    };

    // ── Remove from PDF ──────────────────────────────────────────────────────
    const removePlacedItem = (itemId) => {
        setPlacedItems(prev => prev.filter(i => i.id !== itemId));
    };

    // ── Drag End ─────────────────────────────────────────────────────────────
    const handleDragEnd = (event) => {
        const { active, over, delta } = event;
        const activeId = active.id;

        // Moving an already-placed item
        if (activeId.startsWith('placed-')) {
            const placedId = activeId.replace('placed-', '');
            setPlacedItems(prev =>
                prev.map(item =>
                    item.id === placedId
                        ? { ...item, x: Math.max(0, item.x + delta.x), y: Math.max(0, item.y + delta.y) }
                        : item
                )
            );
            return;
        }

        // Dropping a sidebar item onto a PDF page
        if (activeId.startsWith('sidebar-') && over) {
            const sidebarId = activeId.replace('sidebar-', '');
            const sidebarItem = sidebarItems.find(i => i.id === sidebarId);
            if (!sidebarItem) return;

            const pageNumber = over.data?.current?.pageNumber;
            if (!pageNumber) return;

            if (active.rect.current.translated && over.rect) {
                const x = Math.max(0, active.rect.current.translated.left - over.rect.left);
                const y = Math.max(0, active.rect.current.translated.top - over.rect.top);

                // Add a COPY to placed items (sidebar item stays for re-use)
                setPlacedItems(prev => [...prev, {
                    id: getId(),
                    type: sidebarItem.type,
                    content: sidebarItem.content,
                    x,
                    y,
                    page: pageNumber
                }]);
            }
        }
    };

    // ── Save (send all placed items to backend) ──────────────────────────────
    const handleSave = async () => {
        if (placedItems.length === 0) return alert('Please place at least one signature or image on the PDF first.');
        setSaving(true);
        try {
            await axios.post(`/api/docs/${id}/sign`, {
                position: placedItems[0], // primary signature for backward compat
                annotations: placedItems  // full list
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Document Signed Successfully!');
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            alert('Failed to sign document');
        } finally {
            setSaving(false);
        }
    };

    // ── Reject ───────────────────────────────────────────────────────────────
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const handleReject = async () => {
        if (!rejectReason.trim()) return alert('Please provide a reason for rejection.');
        try {
            await axios.put(`/api/docs/${id}/reject`, { reason: rejectReason }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowRejectModal(false);
            alert('Document rejected.');
            navigate('/dashboard');
        } catch (error) {
            console.error(error);
            alert('Failed to reject document');
        }
    };

    const user = JSON.parse(localStorage.getItem('user'));
    const isOwner = doc && user && doc.ownerId === user._id;
    const canEdit = isOwner || (doc && doc.sharedWith?.some(s => s.email === user?.email && s.permission === 'edit'));

    if (loading) return <div className="p-10 text-center">Loading...</div>;
    if (!doc) return <div className="p-10 text-center">Document not found</div>;

    const fileUrl = `http://localhost:5000/${doc.filePath.replace('\\', '/')}`;

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div className="flex h-[calc(100vh-64px)]">

                    {/* ── Sidebar ─────────────────────────────────────────── */}
                    {canEdit ? (
                        <div className="w-72 bg-white p-4 shadow-r z-10 hidden md:flex flex-col gap-4 overflow-y-auto">
                            <h3 className="font-bold text-gray-700 text-base">Annotations</h3>

                            {/* Text Input Section */}
                            <div className="border rounded-lg p-3 bg-gray-50">
                                <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                                    <Type size={14} className="mr-1.5 text-blue-500" /> Add Text Signature
                                </label>
                                <input
                                    type="text"
                                    placeholder="Type your name..."
                                    value={currentText}
                                    onChange={(e) => setCurrentText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addTextItem()}
                                    className="w-full border rounded px-2 py-1.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                />
                                <button
                                    onClick={addTextItem}
                                    disabled={!currentText.trim()}
                                    className="w-full bg-blue-500 text-white py-1.5 rounded text-sm flex items-center justify-center gap-1 disabled:opacity-40 hover:bg-blue-600"
                                >
                                    <Plus size={14} /> Add Text
                                </button>
                            </div>

                            {/* Image Upload Section */}
                            <div className="border rounded-lg p-3 bg-gray-50">
                                <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                                    <ImageIcon size={14} className="mr-1.5 text-green-500" /> Add Image Signature
                                </label>
                                <label className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-green-300 rounded-lg p-2 cursor-pointer hover:bg-green-50 text-sm text-gray-500">
                                    <Upload size={14} /> Choose Image
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />
                                </label>
                                <p className="text-[10px] text-gray-400 mt-1 text-center">Each upload adds a new draggable image</p>
                            </div>

                            {/* Palette of created items */}
                            {sidebarItems.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Drag onto PDF ↓</p>
                                    <div className="flex flex-col gap-2">
                                        {sidebarItems.map(item => (
                                            <div key={item.id} className="flex items-center gap-2">
                                                <div className="flex-1">
                                                    <SidebarDraggableItem item={item} />
                                                </div>
                                                <button
                                                    onClick={() => removeSidebarItem(item.id)}
                                                    className="text-red-400 hover:text-red-600 flex-shrink-0"
                                                    title="Remove from palette"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {sidebarItems.length === 0 && (
                                <p className="text-xs text-gray-400 text-center mt-2">Add text or image items above, then drag them onto the PDF.</p>
                            )}

                            {/* Placed items count */}
                            {placedItems.length > 0 && (
                                <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-700">
                                    ✓ {placedItems.length} item(s) placed on PDF
                                </div>
                            )}

                            {/* Save button */}
                            <button
                                onClick={handleSave}
                                disabled={saving || placedItems.length === 0}
                                className="w-full bg-blue-600 text-white py-2 rounded flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-blue-700 mt-auto"
                            >
                                {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                                Finalize & Sign
                            </button>

                            {/* Reject button (owner only) */}
                            {isOwner && (
                                <button
                                    onClick={() => setShowRejectModal(true)}
                                    className="w-full bg-red-100 text-red-700 py-2 rounded flex items-center justify-center gap-2 hover:bg-red-200"
                                >
                                    <X className="h-4 w-4" />
                                    Reject Document
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="w-64 bg-gray-50 p-4 shadow-r z-10 hidden md:block">
                            <h3 className="font-bold text-gray-700 mb-4">Read Only</h3>
                            <p className="text-sm text-gray-600">You are viewing a shared document.</p>
                        </div>
                    )}

                    {/* ── PDF Area ──────────────────────────────────────── */}
                    <div className="flex-1 overflow-auto p-8 flex justify-center bg-gray-200">
                        <div className="relative">
                            <Document
                                file={fileUrl}
                                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                                className="shadow-lg"
                            >
                                {Array.from(new Array(numPages), (_, index) => (
                                    <DroppablePage key={index + 1} pageNumber={index + 1}>
                                        <Page
                                            pageNumber={index + 1}
                                            renderTextLayer={false}
                                            renderAnnotationLayer={false}
                                            width={700}
                                        />
                                        {/* Render all placed items on this page */}
                                        {placedItems
                                            .filter(item => item.page === index + 1)
                                            .map(item => (
                                                <PlacedItem
                                                    key={item.id}
                                                    item={item}
                                                    onDelete={removePlacedItem}
                                                />
                                            ))
                                        }
                                    </DroppablePage>
                                ))}
                            </Document>
                        </div>
                    </div>
                </div>
            </DndContext>

            {/* ── Reject Modal ─────────────────────────────────────────── */}
            {showRejectModal && (
                <div className="fixed z-50 inset-0 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={() => setShowRejectModal(false)} />
                        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                                    <X className="h-5 w-5 text-red-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Reject Document</h3>
                            </div>
                            <p className="text-sm text-gray-500 mb-3">Please provide a reason for rejection.</p>
                            <textarea
                                className="w-full border border-gray-300 rounded p-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-300"
                                rows="3"
                                placeholder="Reason for rejection (required)..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                            />
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowRejectModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReject}
                                    className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SignDocument;
