import React from 'react';
import { Link } from 'react-router-dom';
import { sections, hasPermission } from '../../adminPermissions';

export default function AssignedAdminNav({ access, openDropdown, toggleDropdown }) {
  return <>{sections.filter(section => hasPermission(access, section.permission)).map(section => {
    const key = `assigned-${section.permission}`;
    return <li className="dropdown" key={key}>
      <button type="button" className="nav-dropdown-trigger" aria-expanded={openDropdown === key} onClick={() => toggleDropdown(key)}>{section.label.replace(' — all tabs & locations', '')}</button>
      {openDropdown === key && <ul className="dropdown-content">{section.links.map(([label, path]) => <li key={path}><Link to={path}>{label}</Link></li>)}</ul>}
    </li>;
  })}</>;
}
