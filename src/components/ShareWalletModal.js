import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import Modal from './Modal';

export default function ShareWalletModal({ wallet, onClose }) {
  const { findUserByEmail, currentUser } = useAuth();
  const { addMember, removeMember, updateMemberRole } = useFinance();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const members = wallet.members || [];

  const handleAdd = (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!email.trim()) return;
    if (email.toLowerCase() === currentUser.email) { setError("You can't add yourself"); return; }
    const user = findUserByEmail(email.trim());
    if (!user) { setError('No user found with that email'); return; }
    try {
      addMember(wallet.id, user.id, user.name, user.email, role);
      setEmail('');
      setSuccess(`${user.name} added successfully`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemove = (userId) => {
    removeMember(wallet.id, userId);
  };

  const handleRoleChange = (userId, newRole) => {
    updateMemberRole(wallet.id, userId, newRole);
  };

  const roleBadge = { editor: 'bg-blue-100 text-blue-700', viewer: 'bg-gray-100 text-gray-600' };

  return (
    <Modal title="Manage Access" onClose={onClose} size="lg">
      <div className="space-y-5">
        <form onSubmit={handleAdd} className="space-y-3">
          <label className="label">Invite by Email</label>
          <div className="flex gap-2">
            <input className="input" type="email" placeholder="user@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            <select className="input w-32" value={role} onChange={e => setRole(e.target.value)}>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button type="submit" className="btn-primary whitespace-nowrap">Add</button>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-emerald-600 text-sm">{success}</p>}
        </form>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">People with access</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3 py-2 px-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                {wallet.ownerName?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{wallet.ownerName} <span className="text-gray-400">(you)</span></p>
              </div>
              <span className="badge bg-indigo-100 text-indigo-700">Owner</span>
            </div>

            {members.map(m => (
              <div key={m.userId} className="flex items-center gap-3 py-2 px-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm">
                  {m.userName?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{m.userName}</p>
                  <p className="text-xs text-gray-500 truncate">{m.userEmail}</p>
                </div>
                <select
                  className="text-xs border border-gray-200 rounded-md px-2 py-1"
                  value={m.role}
                  onChange={e => handleRoleChange(m.userId, e.target.value)}
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button onClick={() => handleRemove(m.userId)} className="text-red-500 hover:text-red-700 text-lg leading-none">×</button>
              </div>
            ))}

            {members.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No other members yet</p>
            )}
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
          <strong>Editor</strong> can add/delete transactions. <strong>Viewer</strong> can only view.
        </div>
      </div>
    </Modal>
  );
}
