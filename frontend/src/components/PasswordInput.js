import React, { useId, useState } from 'react';

const PasswordInput = ({ id, style, visibilityLabel = 'password', ...props }) => {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', minWidth: 0 }}>
      <input
        {...props}
        id={inputId}
        type={visible ? 'text' : 'password'}
        style={{ ...style, flex: 1, minWidth: 0, width: '100%' }}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={`${visible ? 'Hide' : 'Show'} ${visibilityLabel}`}
        aria-controls={inputId}
        disabled={props.disabled}
        style={{
          width: 'auto', margin: 0, padding: '8px 10px', flexShrink: 0,
          background: '#fff', color: '#222', border: '1px solid #aaa',
          borderRadius: 6, fontSize: 14, lineHeight: '20px', cursor: 'pointer',
        }}
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </span>
  );
};

export default PasswordInput;
