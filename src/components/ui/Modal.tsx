"use client";

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  return (
    <div className={`modal-bg ${open ? "show" : ""}`} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={maxWidth ? { maxWidth } : undefined}>
        <button className="close-x" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}
