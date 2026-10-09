import React, { useState } from 'react';
import NotificationSettings from './NotificationSettings';
export default function ProfileTabs({ children, role, settings = true }) {
  const [tab, setTab] = useState('profile');
  if (!settings) return children;
  return <>
    <div className="profile-tabs" role="tablist" aria-label="Profile sections">
      <button type="button" role="tab" id="profile-tab" aria-controls="profile-panel" aria-selected={tab === 'profile'} onClick={() => setTab('profile')}>Profile</button>
      <button type="button" role="tab" id="settings-tab" aria-controls="settings-panel" aria-selected={tab === 'settings'} onClick={() => setTab('settings')}>Settings</button>
    </div>
    <div id="profile-panel" role="tabpanel" aria-labelledby="profile-tab" hidden={tab !== 'profile'}>{children}</div>
    <div id="settings-panel" role="tabpanel" aria-labelledby="settings-tab" hidden={tab !== 'settings'}>{tab === 'settings' && <NotificationSettings role={role} />}</div>
  </>;
}
