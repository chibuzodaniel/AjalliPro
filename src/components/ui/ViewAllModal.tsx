"use client";

import { useState } from "react";
import Modal from "./Modal";

export default function ViewAllModal({
  title,
  buttonLabel = "View all",
  maxWidth = 1000,
  children,
}: {
  title: string;
  buttonLabel?: string;
  maxWidth?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="btn btn-sm btn-ghost no-print" onClick={() => setOpen(true)}>
        {buttonLabel}
      </button>
      {open && (
        <Modal open={open} onClose={() => setOpen(false)} title={title} maxWidth={maxWidth}>
          <div className="table-wrap">{children}</div>
        </Modal>
      )}
    </>
  );
}
