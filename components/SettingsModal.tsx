
import React, { useState, useEffect } from 'react';
import { X, Save, ShieldCheck, HelpCircle, AlertTriangle, Copy, Check, Globe, Smartphone } from 'lucide-react';
import { driveService } from '../services/googleDriveService';

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [clientId, setClientId] = useState(driveService.getClientId());
  const [saved, setSaved] = useState(false);
  const [origin, setOrigin] = useState('');
  const [hostname, setHostname] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
      setHostname(window.location.hostname);
    }
  }, []);

  const handleSave = () => {
    if (clientId.trim()) {
      driveService.setClientId(clientId.trim());
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 800);
    }
  };

  const copyOrigin = () => {
    navigator.clipboard.writeText(origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Google blocks private IPs (192.168.x.x, 10.x.x.x, 172.16.x.x) as origins
  const isPrivateIP = (host: string) => {
    return (
      host === 'localhost' ||
      host.startsWith('127.') ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      (host.startsWith('172.') && parseInt(host.split('.')[1], 10) >= 16 && parseInt(host.split('.')[1], 10) <= 31)
    );
  };

  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isPrivateNetworkIP = isPrivateIP(hostname) && !isLocalhost;
  const isSecure = origin.startsWith('https') || isLocalhost;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="glass w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-slate-700 animate-in fade-in zoom-in duration-200">
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="text-blue-400" size={24} />
              App Settings
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            
            {/* Critical Warning for Mobile/LAN Users */}
            {isPrivateNetworkIP && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={24} className="text-red-500 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-red-200">Local Network Access Detected</h3>
                    <p className="text-xs text-red-200/80 mt-1 leading-relaxed">
                      You are accessing this app via a Private IP ({hostname}). <br/>
                      <strong className="text-white">Google OAuth DOES NOT support private IP addresses.</strong> You cannot add this URL to the Google Cloud Console.
                    </p>
                    <div className="mt-3 grid gap-2">
                       <div className="bg-slate-900/50 p-2 rounded border border-red-500/20">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Globe size={10} /> Solution 1 (Recommended)</p>
                          <p className="text-xs text-slate-300">Deploy this app to <span className="text-white font-medium">Vercel</span> or <span className="text-white font-medium">Netlify</span>. This gives you a public HTTPS URL that Google accepts.</p>
                       </div>
                       <div className="bg-slate-900/50 p-2 rounded border border-red-500/20">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Smartphone size={10} /> Solution 2 (For Devs)</p>
                          <p className="text-xs text-slate-300">Use a tunneling tool like <span className="text-white font-mono">ngrok</span> on your PC to create a public URL:</p>
                          <code className="block bg-black/30 p-1 mt-1 rounded text-[10px] font-mono text-green-400">ngrok http 3000</code>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Standard Origin Helper */}
            <div className={`rounded-lg p-4 border ${isSecure && !isPrivateNetworkIP ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-800/30 border-slate-700'}`}>
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-1.5 rounded-md ${isPrivateNetworkIP ? 'bg-slate-700' : 'bg-blue-500/10'}`}>
                   {isPrivateNetworkIP ? <AlertTriangle size={16} className="text-slate-400"/> : <Check size={16} className="text-blue-400" />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">
                    Authorized JavaScript Origin
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Copy the URL below and add it to your Google Cloud Console Credentials.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 bg-slate-950 rounded border border-slate-800 p-2">
                <code className={`text-xs flex-1 truncate font-mono ${isPrivateNetworkIP ? 'text-red-400 line-through decoration-red-500/50' : 'text-emerald-400'}`}>
                    {origin}
                </code>
                <button 
                  onClick={copyOrigin}
                  className="text-slate-500 hover:text-white transition-colors"
                  title="Copy URL"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
              
              {!isSecure && !isPrivateNetworkIP && (
                 <p className="text-xs text-amber-500 mt-2 font-medium flex items-center gap-1">
                   <AlertTriangle size={12} /> Google requires HTTPS (unless localhost).
                 </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Google Client ID</label>
              <input 
                type="text" 
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="123456789-abcdef.apps.googleusercontent.com"
                className="w-full bg-slate-900/60 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              />
              <p className="mt-2 text-xs text-slate-500 flex gap-1">
                <HelpCircle size={14} className="mt-0.5" />
                Required to access your Google Drive files.
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-6 pt-0 mt-auto flex justify-end bg-gradient-to-t from-slate-900 to-transparent">
            <button 
              onClick={handleSave}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
                saved 
                ? 'bg-emerald-500 text-white' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
              }`}
            >
              {saved ? (
                <>
                  <ShieldCheck size={18} />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
