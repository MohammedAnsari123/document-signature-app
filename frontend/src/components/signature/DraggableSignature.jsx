import { useDraggable } from '@dnd-kit/core';

const DraggableSignature = ({ id, imageUrl, text }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: id,
    });

    const style = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="inline-block p-2 border-2 border-blue-600 bg-white/50 backdrop-blur-sm cursor-move rounded touch-none relative"
        >
            {(imageUrl || text) ? (
                <div className="flex flex-col items-center pointer-events-none select-none">
                    {imageUrl && (
                        <img src={imageUrl} alt="Signature" className="h-16 w-auto object-contain mb-1" />
                    )}
                    {(text || !imageUrl) && (
                        <div className="font-great-vibes text-xl text-blue-900 px-2">
                            {text || "Sign Here"}
                        </div>
                    )}
                </div>
            ) : (
                <div className="font-great-vibes text-xl text-blue-900 select-none pointer-events-none px-4 py-2">
                    Sign Here
                </div>
            )}
        </div>
    );
};

export default DraggableSignature;
