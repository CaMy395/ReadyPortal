import React, { useEffect, useState } from 'react';
import TermsModal from './components/Homepage/TermsModal';

const StaffW9Gate = ({ apiUrl, currentUser, onW9Complete, allowedRoles = ['user'] }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    // only apply to allowed roles (default: 'user' only)
    const isAllowedRole = allowedRoles.includes(currentUser.role);

    const needsW9 = isAllowedRole &&
      (currentUser.staff_terms_required || !currentUser.w9_uploaded);

    setShow(!!needsW9);
  }, [currentUser, allowedRoles]);

  const finish = async () => {
    try {
      await fetch(`${apiUrl}/api/users/${currentUser.id}/ack-staff-terms`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ w9_uploaded: true, staff_terms_required: false })
      });
    } catch {}
    onW9Complete?.();
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999 }}>
      <TermsModal
        role="user"
        targetUserId={currentUser.id}
        onW9Upload={(uploaded) => uploaded && finish()}
        onClose={() => { /* block closing to enforce flow */ }}
      />
    </div>
  );
};

export default StaffW9Gate;
