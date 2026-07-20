import React, { useEffect, useState } from 'react';
import type { AuditLogEntry, RevocationEntry } from '../electron-contract';

export function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [revocations, setRevocations] = useState<RevocationEntry[]>([]);
  const [revokeReason, setRevokeReason] = useState<Record<string, string>>({});

  const fetchLogs = async () => {
    const fetchedLogs = await window.licenseApi.getAuditLogs();
    const fetchedRevocs = await window.licenseApi.getRevocations();
    setLogs(fetchedLogs);
    setRevocations(fetchedRevocs);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRevoke = async (key: string) => {
    const reason = revokeReason[key] || 'No reason provided';
    if (confirm(`Are you sure you want to revoke this license?\nReason: ${reason}`)) {
      await window.licenseApi.revokeLicense(key, reason);
      await fetchLogs();
    }
  };

  const handleExportRevocations = async () => {
    const path = await window.licenseApi.exportRevocations();
    if (path) {
      alert(`Revocations exported to:\n${path}`);
    }
  };

  const handleExportDatabase = async () => {
    const path = await window.licenseApi.exportDatabase();
    if (path) {
      alert(`Audit Database backed up to:\n${path}`);
    }
  };

  const isRevoked = (key: string) => revocations.some(r => r.licenseKey === key);

  return (
    <div className="audit-log-container">
      <div className="toolbar">
        <button onClick={fetchLogs}>Refresh</button>
        <button onClick={handleExportRevocations}>Export Revocations (JSON)</button>
        <button onClick={handleExportDatabase}>Backup Audit Database (SQLite)</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Issued At</th>
              <th>Operator</th>
              <th>Plan</th>
              <th>Machine ID</th>
              <th>License Key (Prefix)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => {
              const revoked = isRevoked(log.licenseKey);
              return (
                <tr key={log.id} className={revoked ? 'revoked-row' : ''}>
                  <td>{new Date(log.issuedAt).toLocaleString()}</td>
                  <td>{log.operatorUser}</td>
                  <td>{log.plan} ({log.maxMasters} masters)</td>
                  <td title={log.machineId}>{log.machineId.substring(0, 15)}...</td>
                  <td title={log.licenseKey}>{log.licenseKey.substring(0, 20)}...</td>
                  <td>
                    {revoked ? (
                      <span className="status revoked">Revoked</span>
                    ) : (
                      <span className="status active">Active</span>
                    )}
                  </td>
                  <td>
                    {!revoked && (
                      <div className="revoke-action">
                        <input
                          type="text"
                          placeholder="Reason"
                          value={revokeReason[log.licenseKey] || ''}
                          onChange={(e) => setRevokeReason({ ...revokeReason, [log.licenseKey]: e.target.value })}
                        />
                        <button onClick={() => handleRevoke(log.licenseKey)}>Revoke</button>
                      </div>
                    )}
                    {revoked && (
                      <small>{revocations.find(r => r.licenseKey === log.licenseKey)?.reason}</small>
                    )}
                  </td>
                </tr>
              );
            })}
            {logs.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center' }}>No licenses issued yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
